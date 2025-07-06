const { GoogleGenerativeAI } = require('@google/generative-ai');
// THIS IS THE CORRECT WAY TO IMPORT THE SEARCH TOOL FOR A NODE.JS ENVIRONMENT
const { GoogleSearch } = require('@google/generative-ai/server');

// --- AI INITIALIZATION ---
// Your API keys must be set in the Netlify dashboard
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// THIS IS THE MODERN, SIMPLER, AND CORRECT WAY TO INITIALIZE THE MODEL WITH THE TOOL
// It requires a Google API Key with the "Custom Search API" enabled.
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  tools: [new GoogleSearch({ apiKey: process.env.GOOGLE_API_KEY })],
});


exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { jobTitle } = JSON.parse(event.body);
    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Job title is required.' }) };
    }

    // This prompt is well-designed and does not need to be changed.
    const prompt = `
      You are an expert career counselor and curriculum designer. A user wants to train to become a "${jobTitle}".

      Your task is to generate a comprehensive, structured learning curriculum. To do this, you MUST use your search tool to gather real-time data. Follow these steps precisely:

      1.  **Perform Real-Time Research:** Use your search tool to find the most current information on the role of a "${jobTitle}". Your research MUST include:
          - Skills, tools, and technologies mentioned in recent job postings.
          - Core topics and subjects taught in modern online courses, bootcamps, and university programs for this role.

      2.  **Synthesize Findings:** Based ONLY on the results of your real-time research, identify the core technical skills, soft skills, and essential knowledge areas for this job.

      3.  **Structure Modules:** Organize these findings into a logical sequence of progressive modules, starting with fundamentals and moving to advanced topics.

      4.  **Find Free Resources:** For EACH key skill or tool within a module, use your search tool again to find a specific, high-quality, FREE online resource (like a specific tutorial, documentation page, or video series). Provide a direct, clickable link.

      5.  **Add a Capstone Project:** Conclude with a relevant capstone project idea that would allow the user to build a portfolio piece.

      Format the entire output as a single, clean Markdown document.
    `;

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
      body: JSON.stringify({ error: `Failed to generate curriculum: ${error.message}` }),
    };
  }
};
