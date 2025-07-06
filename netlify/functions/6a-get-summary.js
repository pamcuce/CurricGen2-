const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { resourceTitle } = JSON.parse(event.body);
    const prompt = `Provide a concise, one-paragraph summary for the following learning resource: "${resourceTitle}". Format the output as clean HTML within a <p> tag.`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) throw new Error("The AI model returned an empty response for the summary.");
    return { statusCode: 200, body: JSON.stringify({ htmlContent: responseText }) };
  } catch (error) {
    console.error("Error in 6a-get-summary:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 6a (get-summary) failed: ${error.message}` }) };
  }
};
