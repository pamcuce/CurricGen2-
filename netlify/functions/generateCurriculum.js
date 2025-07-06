const { GoogleGenerativeAI } = require('@google/generative-ai');
// This line was likely duplicated. It should only appear once.
const { GoogleSearch } = require("@google/generative-ai/server");

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize the model with a valid model name and the search tool.
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite-preview-06-17',
  tools: [new GoogleSearch({ apiKey: process.env.GOOGLE_API_KEY })],
});

// The main function that Netlify runs when your frontend calls it.
exports.handler = async (event) => {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the job title from the frontend request.
    const { jobTitle } = JSON.parse(event.body);
    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Job title is required.' }) };
    }

    // --- FINAL APPROVED PROMPT ---
    const prompt = `
      **Role:** You are an expert career research agent, guide and super creative curriculum designer who specializes in putting together creative learning paths of free, virtual, quality educational resources.
      **Objective:** Generate a comprehensive, structured learning curriculum for a self-learner who wants to become as much of a qualified "${jobTitle}" as someone who's got a degree. The generated curriculum is to be composed of only free (or almost close to free) virtual educational resources by performing a detailed, real-time analysis. The quality of the generated curriculum content should try to match the quality of an actual training program.

**Process:** You MUST follow these steps precisely. At each step requiring information, you are mandated to use your search tool to gather live, real-time data.

      * **Conduct Real-Time Research:** Use your search tool to perform a deep analysis of the "${jobTitle}" role. Your research must identify the core competencies, knowledge areas, essential skills,  key soft skills, and common tools/technologies mentioned in up-to-date job postings, online courses, trainings, bootcamps, and university programs.



      * **Structure and Find Resources:** Based ONLY on the data from your research, synthesize your findings to identify a list of the MOST indispensable learning objectives or core competencies that must be mastered to properly prepare for the role of "{jobTitle}". Also include any learning objectives and core competencies MOST likely to be incorporated into any top-notch job training for a "{jobTitle}". Structure the curriculum by generating a logical sequence of 5 to 8 progressive modules each with some focus surrounding an identified learning objective, tied to a core competency. Briefly summarize each module's learning objectives at the start and their importance in the job of a "${jobTitle}". Break down each module into a formatted outline of guided learning steps that allow the user to master all the knowledge, skills, and tools that the module requires. You must perform a new, targeted search for each module: For EACH key competency or skill within a module, perform a new, targeted search to find specific, high-quality, FREE online learning resources (e.g., a class, a bootcamp, a tutorial, an article, a video series, hands-on lab, certificate course, online lectures, official documentation, etc.). For every resource, provide a direct, clickable Markdown link and short descriptive blurb.

    * Excellent virtual academic resource examples include a specific tutorial from freeCodeCamp, a course from Khan Academy, free online courses, free bootcamps, tutorials, podcasts, official documentation, a video series on YouTube, publicly available curriculum guides or an MIT OpenCourseware class.

      * **Design a Capstone Project:** Conclude the curriculum with a relevant capstone project idea that would allow a user to build a practical portfolio piece demonstrating the skills learned.

      **Output Formatting Rules:**
      * The entire output MUST be a single Markdown document.
      * Do NOT include any conversational text, apologies, or explanations of your process.
      * Use ## for module titles (e.g., ## Module 1: Foundational Concepts).
      * Use * for each skill/resource pair.
      * Every resource MUST have a direct, clickable Markdown link.
    `;
    
    // Send the prompt to the AI and await the response.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const curriculumMarkdown = response.text();

    // Return the successful result to the frontend.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum: curriculumMarkdown }),
    };

  } catch (error) {
    console.error('Error generating curriculum:', error);
    // Return an error message if something goes wrong.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate curriculum.' }),
    };
  }
};




