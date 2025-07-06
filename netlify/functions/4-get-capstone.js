const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { jobTitle, moduleTitles } = JSON.parse(event.body);
    const prompt = `You are a project-based learning expert. Based on a curriculum for a "${jobTitle}" covering these modules: ${JSON.stringify(moduleTitles)}, design a relevant capstone project. Return a JSON object with "title", "description", and an array of "keyDeliverables".`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) throw new Error("The AI model returned an empty response for the capstone project.");
    JSON.parse(responseText);
    return { statusCode: 200, body: responseText };
  } catch (error) {
    console.error("Error in 4-get-capstone:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 4 (get-capstone) failed: ${error.message}` }) };
  }
};
