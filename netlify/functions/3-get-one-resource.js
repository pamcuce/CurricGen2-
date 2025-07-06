const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    const { module } = JSON.parse(event.body);
    const prompt = `For a learning module titled "${module.title}", find one specific, high-quality, and FREE online educational resource. Return a JSON object with a single key "resource", which is an object with "title", "summary", and "url" keys.`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
        throw new Error("The AI model returned an empty response while searching for a resource.");
    }

    // Validate that the response is valid JSON before sending
    JSON.parse(responseText);

    return { statusCode: 200, body: responseText };
  } catch (error) {
    console.error("Error in 3-get-one-resource:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 3 (get-one-resource) failed: ${error.message}` }) };
  }
};
