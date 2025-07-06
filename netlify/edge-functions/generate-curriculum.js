import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

// --- UTILITY ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- API CALL HELPER for Deno/Edge environment ---
async function callGemini(prompt, isJson = true) {
    const API_KEY = Deno.env.get("GEMINI_API_KEY");
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {}
    };

    if (isJson) {
        body.generationConfig.response_mime_type = "application/json";
    }

    const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Google API Error:", errorText);
        throw new Error(`Google API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error("The AI model returned an empty response.");
    }

    return responseText;
}


export default async (request, context) => {
    const { jobTitle } = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const writeEvent = (type, data) => {
                const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            try {
                // --- AGENT WORKFLOW ---

                // Step 1: Get Competencies
                writeEvent('progress', { step: 1, status: 'loading', text: 'Analyzing core competencies...' });
                const competenciesText = await callGemini(`As a career research expert, analyze the "${jobTitle}" role and identify 5-7 critical core competencies. Return a JSON object with a key "competencies", which is an array of strings.`);
                const { competencies } = JSON.parse(competenciesText);
                writeEvent('progress', { step: 1, status: 'complete', text: 'Competencies identified!' });

                // Step 2: Get Structure
                writeEvent('progress', { step: 2, status: 'loading', text: 'Designing curriculum structure...' });
                const modules = [];
                for (const competency of competencies) {
                    await sleep(1500);
                    const moduleText = await callGemini(`For a "${jobTitle}", create a single learning module for the competency: "${competency}". Return a JSON object with "title" and "objectives" keys.`);
                    modules.push(JSON.parse(moduleText));
                }
                writeEvent('progress', { step: 2, status: 'complete', text: 'Curriculum structure designed!' });

                // Step 3: Get Resources
                writeEvent('progress', { step: 3, status: 'loading', text: 'Finding free online resources...' });
                const populatedModules = [];
                for (const module of modules) {
                    const resources = [];
                    let attempts = 0;
                    while (resources.length < 3 && attempts < 5) {
                        await sleep(7000); // 7-second delay to stay under the rate limit
                        const resourceText = await callGemini(`For a module titled "${module.title}", find one specific, high-quality, FREE online educational resource. Do not suggest any of these already found: ${JSON.stringify(resources.map(r=>r.title))}. Return a JSON object with a single key "resource".`);
                        const { resource } = JSON.parse(resourceText);
                        if (resource && resource.url && !resources.some(r => r.url === resource.url)) {
                            resources.push(resource);
                        }
                        attempts++;
                    }
                    populatedModules.push({ ...module, resources });
                }
                writeEvent('progress', { step: 3, status: 'complete', text: 'Resources curated!' });

                const fullCurriculum = { modules: populatedModules };

                // Step 4: Get Capstone
                writeEvent('progress', { step: 4, status: 'loading', text: 'Designing capstone project...' });
                const capstoneText = await callGemini(`For a "${jobTitle}" curriculum on ${JSON.stringify(modules.map(m=>m.title))}, design a capstone project. Return a JSON object with "title", "description", and an array of "keyDeliverables".`);
                const capstone = JSON.parse(capstoneText);
                writeEvent('progress', { step: 4, status: 'complete', text: 'Capstone project designed!' });

                // Step 5: Format Final Output
                writeEvent('progress', { step: 5, status: 'loading', text: 'Formatting final curriculum...' });
                const curriculum = await callGemini(`**Role:** Expert career guide. **Objective:** Format this data for a "${jobTitle}" into an engaging Markdown curriculum. **Data:** ${JSON.stringify({ ...fullCurriculum, capstone })}. **Rules:** Start with an inspiring intro. Use '##' for titles. Use '###' for 'Key Resources'/'Key Deliverables'. List resources as: **[Title](URL)**: Summary. No conversational text.`, false);
                writeEvent('progress', { step: 5, status: 'complete', text: 'All done!' });

                // Send the final result
                writeEvent('final', { curriculum, competencies });

            } catch (error) {
                console.error('Agent error:', error);
                writeEvent('error', { message: `An error occurred in the agent: ${error.message}` });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
};
