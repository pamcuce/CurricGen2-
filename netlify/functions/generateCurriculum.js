const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// The model is hardcoded to the specific preview version you requested.
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite-preview-06-17',
});

// The main function that Netlify runs.
exports.handler = async (event) => {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { jobTitle } = JSON.parse(event.body);
    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Job title is required.' }) };
    }

    // --- UNBIASED AGENT PROMPT ---
    // This new prompt is carefully worded to be generic and work for ANY job type.
    const prompt = `
      **Role:** You are an expert career research agent and curriculum designer with a passion for being creative with how you use educational materials.
 
      **Objective:** Generate a comprehensive, structured learning curriculum for a self-learner who wants to become a qualified "${jobTitle}".

      **Process:** You MUST follow these steps precisely. At each step requiring information, you are mandated to use your search tool to gather live, real-time data.

      1.  **Initial Research Phase:** First, perform a search for the key responsibilities, essential skills, and common tools mentioned in job descriptions for a "${jobTitle}". Then, perform a second search for subjects taught in relevant courses, workshops, and training programs.

      2.  **Synthesize Core Competencies:** Based ONLY on the real-time data gathered, identify the core competencies for this role. Structure your findings into these neutral categories:
          * **Practical Abilities:** The key things a person in this role must be able to *do*.
          * **Knowledge Areas:** The key things a person in this role must *know*.
          * **Essential Tools:** The key things a person in this role must be able to *use* (this can include anything from software to physical equipment).
          * **Soft Skills:** The key interpersonal attributes required for success.

      3.  **Structure the Curriculum & Find Resources:** Organize the synthesized competencies into around 7-10 logical learning modules. For EACH key competency or skill or tool or knowledge area within a module, perform a new, targeted search to find high-quality and FREE online learning resources (e.g., a course, a program, a tutorial, an article, video series, or official documentation).

      4.  **Design a Capstone Project:** Devise a relevant capstone project that would allow a user to build a portfolio piece demonstrating their new abilities.

      5.  **Make sure to include a nicely formatted paragraph of an intro to the profession and an intro to the background skills that would be helpful for doing the job.

      **Output Instructions:** The final output MUST be a single, clean Markdown document that represents a syllabus. Do NOT include any conversational text, apologies, or explanations of your process in the final output. For every resource, provide a direct, clickable Markdown link. The final syllabus must be in a standardized, stylized, outline format.
    `;
    
    // Generate the content in a single, non-streaming call.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const curriculumMarkdown = response.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum: curriculumMarkdown }),
    };

  } catch (error) {
    console.error('Error generating curriculum:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate curriculum.' }),
    };
  }
};
