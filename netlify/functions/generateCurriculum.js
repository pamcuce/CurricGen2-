const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- MANUAL GOOGLE SEARCH TOOL ---
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
      
      const searchResults = data.items?.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
      })) || [];
      
      console.log(`[Search Tool] Found ${searchResults.length} results.`);
      return { results: searchResults.slice(0, 5) };
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

// --- FINAL FORMATTING FUNCTION (in JavaScript) ---
function formatCurriculumToMarkdown(data, jobTitle) {
    let markdown = `# Learning Path: ${jobTitle}\n\n`;
    markdown += `Here is a comprehensive learning path to become a ${jobTitle}, created with real-time job market data.\n\n`;

    data.modules.forEach(module => {
        markdown += `## ${module.title}\n`;
        markdown += `${module.objectives}\n\n`;
        markdown += `### Key Resources\n`;
        if (module.resources && module.resources.length > 0) {
            module.resources.forEach(resource => {
                markdown += `* **[${resource.title}](${resource.url})**: ${resource.summary}\n`;
            });
        } else {
            markdown += `* No specific resources found for this module.\n`;
        }
        markdown += `\n`;
    });

    if (data.capstone) {
        markdown += `## Capstone Project: ${data.capstone.title}\n`;
        markdown += `${data.capstone.description}\n\n`;
        markdown += `### Key Deliverables\n`;
        data.capstone.keyDeliverables.forEach(deliverable => {
            markdown += `* ${deliverable}\n`;
        });
    }

    return markdown;
}


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

    // THIS IS THE NEW, MORE RELIABLE PROMPT
    const prompt = `
      You are an expert career research agent. A user wants to become a "${jobTitle}".
      Your task is to use your search_the_web tool to gather real-time data and structure a learning plan.
      
      Follow these steps precisely:
      1.  **Research & Synthesize:** Use your search tool to research the skills, tools, and topics for a "${jobTitle}". Synthesize these findings into a list of core competencies.
      2.  **Structure Modules:** Based on your research, define a logical sequence of learning modules.
      3.  **Find Resources:** For each module, use your search tool again to find 3-5 specific, high-quality, FREE online resources.
      4.  **Design Capstone:** Design a relevant capstone project.
      5.  **Final Output:** Return a single, final JSON object containing all the structured data you have gathered. The JSON object should have a "modules" key (an array of objects, each with "title", "objectives", and a "resources" array) and a "capstone" key (an object with "title", "description", and "keyDeliverables"). Do not output this information as Markdown. Output it as a single JSON object only.
    `;

    const chat = model.startChat();
    let result = await chat.sendMessage(prompt);
    
    while (result.response.functionCalls && result.response.functionCalls.length > 0) {
      const calls = result.response.functionCalls;
      
      const tool_responses = await Promise.all(
        calls.map(async (call) => {
          if (call.name === 'search_the_web') {
            const tool_response = await searchTheWeb.function(call.args);
            return { name: call.name, response: tool_response };
          }
        })
      );
      
      result = await chat.sendMessage(JSON.stringify(tool_responses.filter(Boolean)));
    }

    const responseText = result.response.text();
    if (!responseText) {
        throw new Error("The AI model returned an empty data object.");
    }

    // The AI now returns JSON, not Markdown
    const curriculumData = JSON.parse(responseText);

    // The formatting is now done reliably in JavaScript
    const curriculumMarkdown = formatCurriculumToMarkdown(curriculumData, jobTitle);

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
