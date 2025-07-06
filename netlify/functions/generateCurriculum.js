const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuration to ensure the model outputs structured JSON.
const generationConfig = {
  response_mime_type: "application/json",
};

// Model for structured data generation (using JSON mode)
const structuredModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig,
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ],
});

// Model for creative text formatting.
// THE FIX: The GoogleSearch tool has been removed from this model, as its import was causing the crash in the Netlify environment.
// The agent's core research capabilities are not affected.
const creativeModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
});


// ==============================================================================
//  AGENTIC WORKFLOW STEPS
// ==============================================================================

/**
 * STEP 1: Research Core Competencies
 */
async function researchCoreCompetencies(jobTitle) {
  console.log(`[Agent Step 1] Researching core competencies for: ${jobTitle}`);
  const prompt = `
    As a career research expert, perform a deep analysis of the "${jobTitle}" role.
    Your goal is to identify the 5-7 most critical core competencies.
    These should cover the essential technical skills, soft skills, and common tools/technologies.
    Return your findings as a JSON object with a single key "competencies", which is an array of strings.
    Example: {"competencies": ["Competency 1", "Competency 2", ...]}
  `;
  const result = await structuredModel.generateContent(prompt);
  const jsonResponse = JSON.parse(result.response.text());
  console.log(`[Agent Step 1] Competencies identified:`, jsonResponse.competencies);
  return jsonResponse;
}

/**
 * STEP 2: Design the Curriculum Structure
 */
async function designCurriculumStructure(competencies, jobTitle) {
  console.log(`[Agent Step 2] Designing curriculum structure...`);
  const prompt = `
    You are a curriculum designer. Given the core competencies for a "${jobTitle}", which are: ${JSON.stringify(competencies)}.
    Create a logical sequence of learning modules to teach these competencies.
    For each module, provide a title and a brief 1-2 sentence summary of its learning objectives.
    Return a JSON object with a single key "modules", which is an array of objects.
    Each object should have "title" and "objectives" keys.
    Example: {"modules": [{"title": "Module 1: ...", "objectives": "This module covers..."}, ...]}
  `;
  const result = await structuredModel.generateContent(prompt);
  const jsonResponse = JSON.parse(result.response.text());
  console.log(`[Agent Step 2] Structure designed with ${jsonResponse.modules.length} modules.`);
  return jsonResponse;
}

/**
 * STEP 3: Find Resources for Each Module
 */
async function findResourcesForModule(module) {
  console.log(`[Agent Step 3] Finding resources for module: "${module.title}"`);
  const prompt = `
    For a learning module titled "${module.title}" with the objectives "${module.objectives}", find 3-5 specific, high-quality, and FREE online educational resources.
    Excellent examples include specific tutorials from freeCodeCamp, courses from Khan Academy, video series on YouTube, or official documentation.
    Return a JSON object with a single key "resources", which is an array of objects.
    Each resource object must have "title", "summary", and "url" keys.
    Example: {"resources": [{"title": "...", "summary": "...", "url": "..."}, ...]}
  `;
  const result = await structuredModel.generateContent(prompt);
  const jsonResponse = JSON.parse(result.response.text());
  console.log(`[Agent Step 3] Found ${jsonResponse.resources.length} resources for "${module.title}".`);
  return { ...module, resources: jsonResponse.resources };
}

/**
 * STEP 4: Design a Capstone Project
 */
async function designCapstoneProject(fullCurriculum, jobTitle) {
  console.log(`[Agent Step 4] Designing capstone project...`);
  const prompt = `
    You are a project-based learning expert. Based on the following curriculum for a "${jobTitle}", design a relevant capstone project.
    The project should allow a learner to build a practical portfolio piece demonstrating the skills learned.
    Curriculum Summary: ${JSON.stringify(fullCurriculum.modules.map(m => m.title))}
    Return a JSON object with "title", "description", and an array of "keyDeliverables".
  `;
  const result = await structuredModel.generateContent(prompt);
  const jsonResponse = JSON.parse(result.response.text());
  console.log(`[Agent Step 4] Capstone project designed: "${jsonResponse.title}".`);
  return jsonResponse;
}

/**
 * STEP 5: Format the Final Output
 */
async function formatFinalOutput(curriculumData, jobTitle) {
    console.log(`[Agent Step 5] Formatting final Markdown output...`);
    const prompt = `
      **Role:** You are an expert career guide and super creative curriculum designer.
      **Objective:** A self-learner wants to become a "${jobTitle}". You have already conducted all the research and have the structured data. Your task is to format this data into a comprehensive, engaging, and structured learning curriculum in Markdown.

      **Data:**
      ${JSON.stringify(curriculumData)}

      **Output Formatting Rules:**
      * The entire output MUST be a single Markdown document.
      * Start with an inspiring introduction for someone wanting to become a "${jobTitle}".
      * For each module:
        * Use a "##" heading for the title.
        * Write out the module's objectives in a paragraph.
        * List the resources under a "### Key Resources" subheading.
        * For each resource, use a bullet point (*). The format should be: **[Resource Title](Resource URL)**: Resource Summary.
      * For the capstone project:
        * Use a "##" heading for the title.
        * Write the project description.
        * List the key deliverables under a "### Key Deliverables" subheading using bullet points.
      * Do NOT include any conversational text, apologies, or explanations of your process in the final output. The output should be only the curriculum itself.
    `;
    const result = await creativeModel.generateContent(prompt);
    return result.response.text();
}


// ==============================================================================
//  MAIN NETLIFY HANDLER (The Agent Orchestrator)
// ==============================================================================

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { jobTitle } = JSON.parse(event.body);
    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Job title is required.' }) };
    }

    // --- Execute the Agentic Workflow ---
    const { competencies } = await researchCoreCompetencies(jobTitle);
    const curriculumSkeleton = await designCurriculumStructure(competencies, jobTitle);
    const populatedModules = await Promise.all(
      curriculumSkeleton.modules.map(module => findResourcesForModule(module))
    );
    const fullCurriculum = { ...curriculumSkeleton, modules: populatedModules };
    const capstoneProject = await designCapstoneProject(fullCurriculum, jobTitle);
    const finalCurriculumData = { ...fullCurriculum, capstone: capstoneProject };
    const curriculumMarkdown = await formatFinalOutput(finalCurriculumData, jobTitle);

    console.log("[Agent] Workflow complete. Returning final curriculum.");

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum: curriculumMarkdown }),
    };

  } catch (error) {
    console.error('An error occurred in the agent workflow:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate curriculum due to an internal error.' }),
    };
  }
};
