const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { jobTitle } = JSON.parse(event.body);
    const prompt = `Create a sample 30-second "elevator pitch" for a candidate applying for an "${jobTitle}" position. Format the output as clean HTML within a <p> tag.`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) throw new Error("The AI model returned an empty response for the elevator pitch.");
    return { statusCode: 200, body: JSON.stringify({ htmlContent: responseText }) };
  } catch (error) {
    console.error("Error in 7a-get-pitch:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 7a (get-pitch) failed: ${error.message}` }) };
  }
};
