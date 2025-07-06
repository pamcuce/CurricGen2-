const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

exports.handler = async (event) => {
  try {
    const { jobTitle, competencies } = JSON.parse(event.body);
    const prompt = `
      You are an expert career coach. A candidate is preparing for an interview for an "${jobTitle}" position.
      Their known competencies are: ${competencies.join(', ')}.

      Your task is to generate a comprehensive interview prep kit. Format the entire output as clean HTML. Include the following sections:
      1.  A "<h2>30-Second Elevator Pitch</h2>" section with a sample paragraph.
      2.  A "<h2>Behavioral Questions</h2>" section with an ordered list (\`<ol>\`) of 5 common behavioral questions tailored to this role's likely soft skills.
      3.  A "<h2>Technical Questions</h2>" section with an ordered list (\`<ol>\`) of 5 technical questions based on the listed competencies.
    `;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: JSON.stringify({ htmlContent: result.response.text() }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
