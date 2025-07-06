// FILE: netlify/functions/5-format-output.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

exports.handler = async (event) => {
  try {
    const { jobTitle, fullCurriculum } = JSON.parse(event.body);
    const prompt = `**Role:** Expert career guide. **Objective:** Format the following data for a "${jobTitle}" into a comprehensive, engaging Markdown curriculum. **Data:** ${JSON.stringify(fullCurriculum)}. **Formatting Rules:** Start with an inspiring intro. Use '##' for module titles and the capstone project. Use '###' for 'Key Resources' and 'Key Deliverables'. List resources as a bulleted list: **[Resource Title](URL)**: Summary. Do not include conversational text.`;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: JSON.stringify({ curriculum: result.response.text() }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
