// FILE: netlify/functions/1-get-competencies.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { response_mime_type: "application/json" } });

exports.handler = async (event) => {
  try {
    const { jobTitle } = JSON.parse(event.body);
    const prompt = `As a career research expert, analyze the "${jobTitle}" role and identify the 5-7 most critical core competencies. Return a JSON object with a single key "competencies", which is an array of strings.`;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: result.response.text() };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
