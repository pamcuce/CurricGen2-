// FILE: netlify/functions/2-get-structure.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    const { jobTitle, competencies } = JSON.parse(event.body);
    const prompt = `You are a curriculum designer. For a "${jobTitle}" with these competencies: ${JSON.stringify(competencies)}, create a logical sequence of learning modules. Return a JSON object with a key "modules", an array of objects, each with "title" and "objectives" keys.`;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: result.response.text() };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
