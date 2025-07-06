const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    const { module, existingResources } = JSON.parse(event.body);
    const prompt = `
      For a learning module titled "${module.title}", find one specific, high-quality, and FREE online educational resource.
      Do not suggest any of the following already found resources: ${JSON.stringify(existingResources)}.
      Return a JSON object with a single key "resource", which is an object with "title", "summary", and "url" keys.
    `;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: result.response.text() };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
