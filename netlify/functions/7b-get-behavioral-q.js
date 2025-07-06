const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { jobTitle } = JSON.parse(event.body);
    const prompt = `List 5 common behavioral interview questions for an "${jobTitle}" position. Format the output as a clean HTML ordered list (<ol> with <li> tags).`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) throw new Error("The AI model returned an empty response for behavioral questions.");
    return { statusCode: 200, body: JSON.stringify({ htmlContent: responseText }) };
  } catch (error) {
    console.error("Error in 7b-get-behavioral-q:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 7b (get-behavioral-q) failed: ${error.message}` }) };
  }
};
