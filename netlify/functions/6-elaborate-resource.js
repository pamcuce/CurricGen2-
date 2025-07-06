const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

exports.handler = async (event) => {
  try {
    const { resourceUrl, resourceTitle } = JSON.parse(event.body);
    const prompt = `
      You are a learning assistant. A user is studying a curriculum and wants to know more about a specific resource.
      Resource Title: "${resourceTitle}"
      Resource URL: ${resourceUrl}

      Your task is to provide a helpful elaboration. Please generate the following, formatted as clean HTML:
      1.  A "<h4>Summary</h4>" section with a concise paragraph summarizing the resource's content.
      2.  A "<h4>Key Takeaways</h4>" section with an unordered list (\`<ul>\`) of 3-5 bullet points highlighting the most important concepts.
      3.  A "<h4>Practical Exercise</h4>" section with a short, practical exercise a user can do to apply what they've learned from the resource.
    `;
    const result = await model.generateContent(prompt);
    return { statusCode: 200, body: JSON.stringify({ htmlContent: result.response.text() }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
