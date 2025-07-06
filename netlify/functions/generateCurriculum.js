const { GoogleGenerativeAI } = require('@google/generative-ai');
// Import the GoogleSearch tool to enable real-time web searches
const { GoogleSearch } = require("@google/generative-ai/server");

// --- AI INITIALIZATION ---
// This uses your secret API key from the Netlify environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize the model with the search tool and the final system persona
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  // This gives the model the ability to perform live web searches.
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
    // This is the complete set of instructions we built together.
    const prompt = `
      **Role:** You are an expert career research agent, guide and super creative curriculum designer with an eye for engaging material.
      **Objective:** A self-learner wants to become a "${jobTitle}". Your task is to generate a comprehensive, structured learning curriculum made up of only free virtual educational resources or almost free resources (such as a limited free trial, a student discount or credit, or a very cheap class) by performing a detailed, real-time analysis. The generated curriculum of free resources should be optimized as possible to be indistinguishable from a reputable training program in regards to quality of content.

      **Core Instructions:**
      You MUST follow this process precisely:

      * **Conduct Real-Time Research:** Use your search tool to perform a deep analysis of the "${jobTitle}" role. Your research must identify the core competencies, key technical skills, essential soft skills, and common tools/technologies mentioned in up-to-date job postings, online courses, bootcamps, and university programs.

      * **Structure and Find Resources:** Based ONLY on the data from your research, synthesize your findings to identify a list of the MOST indispensable learning objectives or core competencies that must be mastered to properly prepare for the role of "{jobTitle}". Also include any learning objectives and core competencies MOST likely to be incorporated into any top-notch job training for a "{jobTitle}". Structure the curriculum by generating a logical sequence of progressive modules each with some focus surrounding an identified learning objective, tied to a core competency. Briefly summarize each module's learning objectives at the start and their importance in the grand scheme of being a "${jobTitle}". Break down each module into a formatted outline of guided learning steps that allow the user to master all the concepts, skills, tools, etc. that the module requires. You must perform a new, targeted search for each module: to find specific, high-quality, and FREE online educational resources for every learning step that must be taught. Populate a guided outline full of free educational resources to utilize for each module. For each resource that you find, briefly summarize it and give its exact link.
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
