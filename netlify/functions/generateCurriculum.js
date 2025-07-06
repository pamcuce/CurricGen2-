const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- MANUAL GOOGLE SEARCH TOOL ---
// This function manually calls the Google Custom Search API.
// This bypasses the broken `@google/generative-ai/server` library.
const searchTheWeb = {
  async function(tool_input) {
    const { query } = tool_input;
    console.log(`[Search Tool] Performing search for: ${query}`);
    
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
    
    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
      throw new Error("Missing GOOGLE_API_KEY or SEARCH_ENGINE_ID environment variables.");
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Search API request failed with status ${response.status}`);
      }
      const data = await response.json();
      
      // Extract snippets and titles to return to the model
      const searchResults = data.items?.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
      })) || [];
      
      console.log(`[Search Tool] Found ${searchResults.length} results.`);
      return { results: searchResults };
    } catch (error) {
      console.error("[Search Tool] Error:", error);
      return { error: "Failed to fetch search results." };
    }
  }
};

// --- MODEL INITIALIZATION WITH MANUAL TOOL ---
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  tools: [{
    function_declarations: [
      {
        name: "search_the_web",
        description: "Search the web for real-time information using Google Search.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query.",
            },
          },
          required: ["query"],
        },
      },
    ],
  }],
});

// --- MAIN HANDLER ---
exports.handler = async (event) => {
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

      Your task is to generate a comprehensive, structured learning curriculum. To do this, you MUST use your search_the_web tool to gather real-time data. Follow these steps precisely:

      1.  **Perform Real-Time Research:** Use your search_the_web tool to find the most current information on the role of a "${jobTitle}". Your research MUST include skills, tools, and technologies from recent job postings, and topics from online courses.
      2.  **Synthesize Findings:** Based ONLY on the results of your research, identify the core technical skills, soft skills, and essential knowledge areas.
      3.  **Structure Modules:** Organize these findings into a logical sequence of progressive modules.
      4.  **Find Free Resources:** For EACH key skill or tool within a module, use your search_the_web tool again to find a specific, high-quality, FREE online resource (like a specific tutorial, documentation page, or video series). Provide a direct, clickable link.
      5.  **Add a Capstone Project:** Conclude with a relevant capstone project idea.

      Format the entire output as a single, clean Markdown document. Do not ask for permission to use the tool; just use it as needed.
    `;

    const chat = model.startChat();
    let result = await chat.sendMessage(prompt);
    let response = result.response;

    // This loop handles the function calling process.
    while (response.functionCalls) {
      const calls = response.functionCalls;
      const tool_responses = [];

      for (const call of calls) {
        if (call.name === 'search_the_web') {
          const tool_response = await searchTheWeb.function(call.args);
          tool_responses.push({
            name: call.name,
            response: tool_response,
          });
        }
      }
      
      // Send the tool's response back to the model
      result = await chat.sendMessage(JSON.stringify(tool_responses));
      response = result.response;
    }

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
