const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleSearch } = GoogleGenerativeAI;

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// The model is initialized with the gemini-1.5-pro model and the search tool configuration.
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  tools: [{
    function_declarations: [
      {
        name: "Google Search",
        description: "Search the web using google search",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The query to run against google search",
            },
          },
          required: ["query"],
        },
      },
    ],
    tool_code: googleSearchToolCode, // We'll define this function below
  }],
});

// Define the tool code for Google Search
async function googleSearchToolCode(tool_input) {
  const googleSearch = new GoogleSearch({
    apiKey: process.env.GEMINI_API_KEY,
    cx: process.env.SEARCH_ENGINE_ID,
  });
  const result = await googleSearch.search(tool_input);
  return result;
}

// The model is given the now correctly configured search tool.
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  tools: {googleSearch},
});


exports.handler = async (event) => {
  // The rest of the handler function is the same as before.
  // ... (no changes needed below this line) ...
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { jobTitle } = JSON.parse(event.body);
    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Job title is required.' }) };
    }

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
      body: JSON.stringify({ error: 'Failed to generate curriculum.' }),
    };
  }
};
