const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { jobTitle, competencies } = JSON.parse(event.body);
    const prompt = `List 5 technical interview questions for an "${jobTitle}" position, based on these competencies: ${competencies.join(', ')}. Format the output as a clean HTML ordered list (<ol> with <li> tags).`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    if (!responseText) {
      throw new Error("The AI model returned an empty response for technical questions.");
    }
    
    return { statusCode: 200, body: JSON.stringify({ htmlContent: responseText }) };
  } catch (error) {
    console.error("Error in 7c-get-technical-q:", error);
    return { statusCode: 500, body: JSON.stringify({ error: `Function 7c (get-technical-q) failed: ${error.message}` }) };
  }
};
