<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Curriculum Generator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .step-icon { transition: all 0.3s ease-in-out; }
        .spinner { border-top-color: #3b82f6; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .prose h2 { font-size: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 1.5em; }
        .prose h3 { font-size: 1.25rem; margin-top: 1.5em; }
        .prose a { color: #3b82f6; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800">
    <div class="container mx-auto p-4 sm:p-8 max-w-4xl">
        <header class="text-center mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900">AI Curriculum Generator</h1>
        </header>

        <div class="bg-white p-6 rounded-xl shadow-lg mb-8">
            <div class="flex flex-col sm:flex-row gap-4">
                <input type="text" id="jobTitleInput" placeholder="Enter any job title..." class="flex-grow p-3 border rounded-lg">
                <button id="generateBtn" class="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition">Generate</button>
            </div>
        </div>

        <div id="progressContainer" class="hidden bg-white p-6 rounded-xl shadow-lg mb-8">
            <div id="step1" class="flex items-center space-x-4"><div id="step1_icon" class="step-icon h-8 w-8 rounded-full flex items-center justify-center bg-gray-300"></div><p class="text-gray-600 font-medium">Analyzing required skills for the role</p></div>
            <div id="step2" class="flex items-center space-x-4 mt-4"><div id="step2_icon" class="step-icon h-8 w-8 rounded-full flex items-center justify-center bg-gray-300"></div><p class="text-gray-600 font-medium">Structuring the learning path</p></div>
            <div id="step3" class="flex items-center space-x-4 mt-4"><div id="step3_icon" class="step-icon h-8 w-8 rounded-full flex items-center justify-center bg-gray-300"></div><p class="text-gray-600 font-medium">Curating resources and building the syllabus</p></div>
        </div>

        <div id="resultSection" class="hidden bg-white p-8 rounded-xl shadow-lg">
             <h2 id="resultTitle" class="text-3xl font-bold text-gray-900 mb-6"></h2>
             <div id="syllabusOutput" class="prose max-w-none"></div>
        </div>
    </div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const generateBtn = document.getElementById('generateBtn');
    const jobTitleInput = document.getElementById('jobTitleInput');
    const progressContainer = document.getElementById('progressContainer');
    const resultSection = document.getElementById('resultSection');
    const resultTitle = document.getElementById('resultTitle');
    const syllabusOutput = document.getElementById('syllabusOutput');
    const stepIcons = {
        1: document.getElementById('step1_icon'),
        2: document.getElementById('step2_icon'),
        3: document.getElementById('step3_icon'),
    };
    const spinnerSVG = `<div class="spinner h-5 w-5 rounded-full border-2 border-transparent"></div>`;
    const checkSVG = `<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`;

    const updateStep = (stepNumber, status) => {
        const icon = stepIcons[stepNumber];
        if (!icon) return;
        icon.innerHTML = status === 'loading' ? spinnerSVG : checkSVG;
        icon.className = `step-icon h-8 w-8 rounded-full flex items-center justify-center text-white ${status === 'loading' ? 'bg-blue-500' : 'bg-green-500'}`;
    };

    const resetUI = () => {
        progressContainer.classList.add('hidden');
        resultSection.classList.add('hidden');
        syllabusOutput.innerHTML = '';
        Object.values(stepIcons).forEach(icon => {
            icon.innerHTML = '';
            icon.className = 'step-icon h-8 w-8 rounded-full flex items-center justify-center bg-gray-300';
        });
    };

    const generateCurriculum = async () => {
        const jobTitle = jobTitleInput.value.trim();
        if (!jobTitle) return;

        resetUI();
        progressContainer.classList.remove('hidden');
        generateBtn.disabled = true;
        updateStep(1, 'loading');

        try {
            const response = await fetch('/.netlify/functions/generateCurriculum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobTitle })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'The server responded with an error.');
            }

            // Update progress simulation
            updateStep(1, 'success');
            updateStep(2, 'loading');

            const data = await response.json();

            // Finalize UI
            updateStep(2, 'success');
            updateStep(3, 'success');

            resultTitle.textContent = `Learning Path: ${jobTitle}`;
            syllabusOutput.innerHTML = marked.parse(data.curriculum);
            resultSection.classList.remove('hidden');

        } catch (error) {
            console.error("Error:", error);
            alert(error.message);
            progressContainer.classList.add('hidden');
        } finally {
            generateBtn.disabled = false;
        }
    };

    generateBtn.addEventListener('click', generateCurriculum);
    jobTitleInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') generateBtn.click();
    });
});
</script>
</body>
</html>
