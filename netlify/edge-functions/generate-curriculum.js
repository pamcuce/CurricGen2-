// This function runs on Netlify's Edge computing platform (Deno runtime).

// This helper function manually calls the Gemini API's streaming endpoint.
async function* streamGemini(prompt) {
  const API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${API_KEY}&alt=sse`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error:", errorText);
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
  }

  // Yield the response body as a stream
  yield response.body;
}

export default async (request, context) => {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const { jobTitle } = await request.json();
    if (!jobTitle) {
      return new Response(JSON.stringify({ error: 'Job title is required.' }), { status: 400 });
    }

    // The single, powerful prompt for the streaming agent.
    const prompt = `
      You are an expert career counselor and curriculum designer. A user wants to train to become a "${jobTitle}".
      Your task is to generate a comprehensive, structured learning curriculum in a single, continuous stream of Markdown.
      
      Follow these steps precisely, and output the content for each step as you complete it:

      1.  **Introduction:** Start with a brief, inspiring introduction for someone starting this career path.
      2.  **Core Competencies:** Research and list the 5-7 most critical core competencies for a "${jobTitle}".
      3.  **Module Generation:** For each core competency, create a detailed module. Each module must include:
          - A clear title.
          - A 1-2 sentence objective.
          - A list of 3-5 specific, high-quality, FREE online resources (tutorials, videos, documentation). For each resource, provide a direct, clickable Markdown link and a brief summary.
      4.  **Capstone Project:** Conclude with a relevant capstone project idea that would allow the user to build a portfolio piece.
      5.  **Final Words:** End with a short, encouraging closing statement.

      Format the entire output as a single, clean Markdown document. Use '##' for main section titles and '###' for module titles.
    `;

    // Get the stream from the Gemini API
    const geminiStreamGenerator = await streamGemini(prompt);
    const geminiStream = geminiStreamGenerator.next().value;


    // Return the stream directly to the client
    return new Response(geminiStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: `Edge Function Error: ${error.message}` }), { status: 500 });
  }
};
