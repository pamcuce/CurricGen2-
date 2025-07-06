// FILE: netlify/functions/3-get-resources.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    const { module } = JSON.parse(event.body);
    const prompt = `For a learning module titled "${module.title}" with objectives "${module.objectives}", find 3-5 specific, high-quality, and FREE online educational resources. Return a JSON object with a key "resources", an array of objects, each with "title", "summary", and "url" keys.`;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: result.response.text() };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
