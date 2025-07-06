const { stream } = require('@netlify/functions');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
  response_mime_type: "application/json",
};

const structuredModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ],
});

const creativeModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
});

// ==============================================================================
//  AGENTIC WORKFLOW STEPS (These do not change)
// ==============================================================================

async function researchCoreCompetencies(jobTitle) {
  console.log(`[Agent Step 1] Researching core competencies for: ${jobTitle}`);
  const prompt = `As a career research expert, perform a deep analysis of the "${jobTitle}" role. Your goal is to identify the 5-7 most critical core competencies. Return your findings as a JSON object with a single key "competencies", which is an array of strings.`;
  const result = await structuredModel.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function designCurriculumStructure(competencies, jobTitle) {
  console.log(`[Agent Step 2] Designing curriculum structure...`);
  const prompt = `You are a curriculum designer. Given the core competencies for a "${jobTitle}": ${JSON.stringify(competencies)}. Create a logical sequence of learning modules. For each module, provide a title and a brief 1-2 sentence summary of its learning objectives. Return a JSON object with a single key "modules", which is an array of objects, each with "title" and "objectives" keys.`;
  const result = await structuredModel.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function findResourcesForModule(module, jobTitle) {
    console.log(`[Agent Step 3] Finding resources for module: "${module.title}"`);
    const prompt = `For a learning module for a "${jobTitle}" titled "${module.title}" with objectives "${module.objectives}", find 3-5 specific, high-quality, and FREE online educational resources. Return a JSON object with a key "resources", an array of objects, each with "title", "summary", and "url" keys.`;
    const result = await structuredModel.generateContent(prompt);
    return { ...module, resources: JSON.parse(result.response.text()).resources };
}

async function designCapstoneProject(fullCurriculum, jobTitle) {
  console.log(`[Agent Step 4] Designing capstone project...`);
  const prompt = `You are a project-based learning expert. Based on this curriculum for a "${jobTitle}", design a relevant capstone project. Curriculum Summary: ${JSON.stringify(fullCurriculum.modules.map(m => m.title))}. Return a JSON object with "title", "description", and an array of "keyDeliverables".`;
  const result = await structuredModel.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function formatFinalOutput(curriculumData, jobTitle) {
    console.log(`[Agent Step 5] Formatting final Markdown output...`);
    const prompt = `**Role:** Expert career guide. **Objective:** Format the following data for a "${jobTitle}" into a comprehensive, engaging Markdown curriculum. **Data:** ${JSON.stringify(curriculumData)}. **Formatting Rules:** Start with an inspiring intro. Use '##' for module titles and the capstone project. Use '###' for 'Key Resources' and 'Key Deliverables'. List resources as a bulleted list: **[Resource Title](URL)**: Summary. Do not include conversational text.`;
    const result = await creativeModel.generateContent(prompt);
    return result.response.text();
}

// ==============================================================================
//  MAIN NETLIFY HANDLER (Using the official Netlify 'stream' wrapper)
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
                // STEP 1
                writeEvent('progress', { step: 1, status: 'loading' });
                const { competencies } = await researchCoreCompetencies(jobTitle);
                writeEvent('progress', { step: 1, status: 'complete' });

                // STEP 2
                writeEvent('progress', { step: 2, status: 'loading' });
                const curriculumSkeleton = await designCurriculumStructure(competencies, jobTitle);
                writeEvent('progress', { step: 2, status: 'complete' });

                // STEP 3
                writeEvent('progress', { step: 3, status: 'loading' });
                const populatedModules = await Promise.all(
                    curriculumSkeleton.modules.map(module => findResourcesForModule(module, jobTitle))
                );
                const fullCurriculum = { ...curriculumSkeleton, modules: populatedModules };
                
                // STEP 4
                const capstoneProject = await designCapstoneProject(fullCurriculum, jobTitle);
                
                // STEP 5
                const finalCurriculumData = { ...fullCurriculum, capstone: capstoneProject };
                const curriculumMarkdown = await formatFinalOutput(finalCurriculumData, jobTitle);
                
                writeEvent('final', { curriculum: curriculumMarkdown });
                writeEvent('progress', { step: 3, status: 'complete' });

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
