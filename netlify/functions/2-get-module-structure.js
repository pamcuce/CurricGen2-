const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { jobTitle, competency } = JSON.parse(event.body);
    const prompt = `You are a curriculum designer. For a "${jobTitle}", create a single learning module based on the core competency: "${competency}". Return a JSON object with two keys: "title" for the module title, and "objectives" for a 1-2 sentence summary of its learning objectives.`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("The AI model returned an empty response for a module structure.");
    }

    JSON.parse(responseText);
    return { statusCode: 200, body: responseText };
  } catch (error) {
    console.error("Error in 2-get-module-structure:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 2 (get-module-structure) failed: ${error.message}` }) };
  }
};
