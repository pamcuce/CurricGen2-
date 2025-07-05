const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- AI INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// The model is hardcoded to the specific preview version you requested.
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite-preview-06-17',
});

// The main function that Netlify runs.
exports.handler = async (event) => {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { jobTitle } = JSON.parse(event.body);
    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Job title is required.' }) };
    }

    // --- UNBIASED AGENT PROMPT ---
    // This prompt is carefully worded to be generic and work for ANY job type.
    const prompt = `
      **Role:** You are an expert career research agent and curriculum designer who specializes in putting together creative learning parthways for those who need free, virtual, quality educational resources.
      **Objective:** Generate a comprehensive, structured learning curriculum for a self-learner who wants to become as much of a qualified "${jobTitle}" as someone who's got a degree.
      **Process:** You MUST follow these steps precisely. At each step requiring information, you are mandated to use your search tool to gather live, real-time data.
      1.  **Initial Research Phase:** First, perform a search for the key responsibilities, essential skills, and common tools mentioned in job descriptions for a "${jobTitle}". Then, perform a second search for subjects taught in relevant courses, bootcamps, workshops, training, and degree programs.
      2.  **Synthesize Core Competencies:** Based ONLY on the real-time data gathered, identify the core competencies for this role. Structure your findings into these neutral categories:
          * **Practical Abilities:** The key things a person in this role must be able to *do*.
          * **Knowledge Areas:** The key things a person in this role must *know*.
          * **Essential Tools:** The key things a person in this role must be able to *use* (this can include anything from software to physical equipment).
          * **Soft Skills:** The key interpersonal attributes required for success.
      3.  **Structure the Curriculum & Find Resources:** Organize the synthesized competencies into 7-10 progressive, logical learning modules, beginning the curriculum with a brief excitedly toned intro into the history of the occupation of "${jobTitle}" and what foundational knowledge should be thought of as mandatory when seeking work as a "${jobTitle}". For EACH key competency or skill within a module, perform a new, targeted search to find specific, high-quality, FREE online learning resources (e.g., a class, a bootcamp, a tutorial, an article, a video series, hands-on lab, certificate course, online lectures, official documentation, etc.) or almost free virtual resources that might be of use (such as free trial offerings, discounts, specials for students, or super low cost programs). 
      4.  **Design a Capstone Project:** Devise a relevant capstone project that would allow a user to build a portfolio piece demonstrating their new abilities.
      **Output Instructions:** The final output MUST be a single, clean, formatted, properly outlined Markdown document. Do NOT include any conversational text, apologies, or explanations of your process in the final output. For every resource, provide a direct, clickable Markdown link.
    `;
    
    // Generate the content in a single, non-streaming call.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const curriculumMarkdown = response.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculum: curriculumMarkdown }),
    };

  } catch (error) {
    console.error('Error generating curriculum:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate curriculum.' }),
    };
  }
};
