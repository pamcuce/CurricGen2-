const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { jobTitle, fullCurriculum } = JSON.parse(event.body);
    const prompt = `**Role:** Expert career guide. **Objective:** Format the following data for a "${jobTitle}" into a comprehensive, engaging Markdown curriculum. **Data:** ${JSON.stringify(fullCurriculum)}. **Formatting Rules:** Start with an inspiring intro. Use '##' for module titles and the capstone project. Use '###' for 'Key Resources' and 'Key Deliverables'. List resources as a bulleted list: **[Resource Title](URL)**: Summary. Do not include conversational text.`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) throw new Error("The AI model returned an empty response for the final formatting.");
    return { statusCode: 200, body: JSON.stringify({ curriculum: responseText }) };
  } catch (error) {
    console.error("Error in 5-format-output:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 5 (format-output) failed: ${error.message}` }) };
  }
};
