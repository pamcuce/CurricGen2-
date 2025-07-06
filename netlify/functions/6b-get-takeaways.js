const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
exports.handler = async (event) => {
  try {
    const { resourceTitle } = JSON.parse(event.body);
    const prompt = `List 3-5 key takeaways from the learning resource: "${resourceTitle}". Format the output as a clean HTML unordered list (<ul> with <li> tags).`;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: JSON.stringify({ htmlContent: result.response.text() }) };
  } catch (error) { return { statusCode: 500, body: JSON.stringify({ error: error.message }) }; }
};
