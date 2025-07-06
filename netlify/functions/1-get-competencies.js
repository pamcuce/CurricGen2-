const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { jobTitle } = JSON.parse(event.body);
    const prompt = `As a career research expert, analyze the "${jobTitle}" role and identify the 5-7 most critical core competencies. Return a JSON object with a single key "competencies", which is an array of strings.`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("The AI model returned an empty response. This might be due to a content safety filter.");
    }
    
    JSON.parse(responseText);
    return { statusCode: 200, body: responseText };
  } catch (error) {
    console.error("Error in 1-get-competencies:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 1 (get-competencies) failed: ${error.message}` }) };
  }
};
