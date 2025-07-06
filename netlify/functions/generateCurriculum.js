const { stream } = require('@netlify/functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const jsonModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// --- UTILITY ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==============================================================================
//  MAIN NETLIFY STREAMING HANDLER
// ==============================================================================
exports.handler = stream(async (event) => {
    const { jobTitle } = JSON.parse(event.body);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const writeEvent = (type, data) => {
                const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            try {
                // --- AGENT WORKFLOW ---

                // Step 1: Get Competencies
                writeEvent('progress', { step: 1, status: 'loading', text: 'Analyzing core competencies...' });
                const competenciesResult = await jsonModel.generateContent(`As a career research expert, analyze the "${jobTitle}" role and identify the 5-7 most critical core competencies. Return a JSON object with a single key "competencies", which is an array of strings.`);
                const { competencies } = JSON.parse(competenciesResult.response.text());
                writeEvent('progress', { step: 1, status: 'complete', text: 'Competencies identified!' });

                // Step 2: Get Structure
                writeEvent('progress', { step: 2, status: 'loading', text: 'Designing curriculum structure...' });
                const modules = [];
                for (const competency of competencies) {
                    await sleep(1500); // Small delay between calls
                    const moduleResult = await jsonModel.generateContent(`You are a curriculum designer. For a "${jobTitle}", create a single learning module based on the core competency: "${competency}". Return a JSON object with "title" and "objectives" keys.`);
                    modules.push(JSON.parse(moduleResult.response.text()));
                }
                writeEvent('progress', { step: 2, status: 'complete', text: 'Curriculum structure designed!' });

                // Step 3: Get Resources (The Repeating Loop)
                writeEvent('progress', { step: 3, status: 'loading', text: 'Finding free online resources...' });
                const populatedModules = [];
                for (const module of modules) {
                    const resources = [];
                    let attempts = 0;
                    while (resources.length < 3 && attempts < 5) {
                        await sleep(6500); // 6.5-second delay to stay under the 10 requests/minute limit
                        const resourceResult = await jsonModel.generateContent(`For a learning module titled "${module.title}", find one specific, high-quality, and FREE online educational resource. Do not suggest any of these already found: ${JSON.stringify(resources.map(r=>r.title))}. Return a JSON object with a single key "resource".`);
                        const { resource } = JSON.parse(resourceResult.response.text());
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
                const capstoneResult = await jsonModel.generateContent(`You are a project-based learning expert. Based on a curriculum for a "${jobTitle}" covering these modules: ${JSON.stringify(modules.map(m => m.title))}, design a relevant capstone project. Return a JSON object with "title", "description", and an array of "keyDeliverables".`);
                const capstone = JSON.parse(capstoneResult.response.text());
                writeEvent('progress', { step: 4, status: 'complete', text: 'Capstone project designed!' });

                // Step 5: Format Final Output
                writeEvent('progress', { step: 5, status: 'loading', text: 'Formatting final curriculum...' });
                const formatResult = await textModel.generateContent(`**Role:** Expert career guide. **Objective:** Format the following data for a "${jobTitle}" into a comprehensive, engaging Markdown curriculum. **Data:** ${JSON.stringify({ ...fullCurriculum, capstone })}. **Formatting Rules:** Start with an inspiring intro. Use '##' for module titles and the capstone project. Use '###' for 'Key Resources' and 'Key Deliverables'. List resources as a bulleted list: **[Resource Title](URL)**: Summary. Do not include conversational text.`);
                const curriculum = formatResult.response.text();
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

    return {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
        body: readable,
        statusCode: 200,
    };
});
