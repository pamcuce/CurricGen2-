const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { resourceTitle } = JSON.parse(event.body);
    const prompt = `List 3-5 key takeaways from the learning resource: "${resourceTitle}". Format the output as a clean HTML unordered list (<ul> with <li> tags).`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) throw new Error("The AI model returned an empty response for takeaways.");
    return { statusCode: 200, body: JSON.stringify({ htmlContent: responseText }) };
  } catch (error) {
    console.error("Error in 6b-get-takeaways:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 6b (get-takeaways) failed: ${error.message}` }) };
  }
};
