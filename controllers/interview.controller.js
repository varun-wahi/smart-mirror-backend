// Add dotenv configuration at the top
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const questionProvider = require('../questionProvider');

// Initialize the GoogleGenerativeAI instance with the Gemini API key
// Only initialize if the API key exists (for fallback purposes)
let genAI;
if (process.env.GEMINI_SECRET_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_SECRET_KEY);
}

// Function to generate interview questions
const getInterviewQuestions = async (req, res) => {
    try {
        const { topic, difficulty, numQuestions } = req.body;

        // Validate the input
        if (!topic || !difficulty || !numQuestions) {
            return res.status(400).json({ error: 'Please provide topic, difficulty, and numQuestions.' });
        }

        // First, try to get questions from our local repository
        const localQuestions = questionProvider.getQuestions(topic, difficulty, parseInt(numQuestions));
        
        // If we found enough questions locally, return them
        if (localQuestions.length === parseInt(numQuestions)) {
            return res.status(200).json({ questions: localQuestions });
        }
        
        // If we found some questions but not enough, return what we have
        if (localQuestions.length > 0) {
            return res.status(200).json({ 
                questions: localQuestions,
                message: `Found ${localQuestions.length} questions for topic "${topic}" at "${difficulty}" difficulty. This is fewer than the ${numQuestions} requested.`
            });
        }
        
        // If we have no questions locally and Gemini is configured, use it as fallback
        if (genAI) {
            console.log(`No local questions found for topic "${topic}". Falling back to Gemini API.`);
            
            // Get the model - using the updated model name
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            // Format the prompt to explicitly request JSON
            const prompt = `Generate ${numQuestions} interview questions on the topic '${topic}' at '${difficulty}' difficulty level. Provide answers for each question.

IMPORTANT: Your response must be ONLY a valid JSON array where each item is an object with "question" and "answer" keys, like this:
[
    {
        "question": "Example question text here?",
        "answer": "Example answer text here."
    }
]

Do not include any explanations, markdown formatting, or additional text - return ONLY the JSON array.`;

            // Generation config without the unsupported responseFormat parameter
            const generationConfig = {
                temperature: 0.7,
                topP: 0.8,
                topK: 40
            };

            // Call the Gemini API using the generative model
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig
            });

            // Extract the response text from the result
            let responseText = result.response.text();

            // Clean the response to remove potential formatting
            responseText = responseText.replace(/```json|```/g, '').trim();

            let questions;
            try {
                // Parse the cleaned response as JSON
                questions = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error parsing the cleaned response as JSON:', parseError.message);
                return res.status(500).json({
                    error: 'The response from the API was not in the expected JSON format after cleaning. Please try again later.',
                    details: responseText // Send the raw response for debugging
                });
            }

            // Validate the JSON structure
            if (!Array.isArray(questions) || questions.some(q => !q.question || !q.answer)) {
                return res.status(500).json({
                    error: 'The response from the API did not contain the expected structure. Please try again later.',
                    details: questions // Send the parsed response for debugging
                });
            }

            // Send the questions back to the client
            return res.status(200).json({ 
                questions,
                source: 'gemini' // Indicate these came from Gemini
            });
        }
        
        // If we have no local questions and no Gemini API configured
        return res.status(404).json({ 
            error: `No questions found for topic "${topic}" at "${difficulty}" difficulty and no AI fallback is configured.`,
            availableTopics: questionProvider.listTopics()
        });
        
    } catch (error) {
        console.error('Error generating interview questions:', error.message);
        if (error.message.includes('API key')) {
            return res.status(401).json({ error: 'Invalid API key. Please check your Gemini API key configuration.' });
        }
        res.status(500).json({ error: 'Failed to generate interview questions. Please try again later.' });
    }
};

/**
 * Analyze a single answer using Gemini
 */
const analyzeAnswer = async (req, res) => {
    try {
        const { question, answer, context, difficulty } = req.body;

        // Validate the input
        if (!question || !answer) {
            return res.status(400).json({ error: 'Please provide question and answer.' });
        }
        
        // Check if Gemini API is configured
        if (!genAI) {
            return res.status(501).json({ 
                error: 'Answer analysis requires Gemini API which is not configured.',
                feedback: 'Your answer has been recorded but automated feedback is not available.'
            });
        }

        // Get the model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Format the prompt to explicitly request JSON
        const prompt = `
You are an expert interview coach analyzing an answer to an interview question.

Interview Context:
- Topic: ${context || 'General'}
- Difficulty: ${difficulty || 'Medium'}

Question: "${question}"

Answer: "${answer}"

Please analyze this answer objectively and provide detailed feedback. 

IMPORTANT: Your response must be ONLY a valid JSON object with the following structure:
{
  "relevanceScore": number (1-10),
  "completenessScore": number (1-10),
  "clarityScore": number (1-10),
  "accuracyScore": number (1-10),
  "overallScore": number (1-10),
  "feedback": "string with specific observations about strengths and weaknesses",
  "improvementSuggestions": "string with actionable advice on how the answer could be improved"
}

Guidelines for scoring:
- Relevance (1-10): How well does the answer address the specific question asked?
- Completeness (1-10): How thoroughly does the answer cover all aspects of the question?
- Clarity (1-10): How clear, concise, and well-structured is the answer?
- Accuracy (1-10): How technically accurate and factually correct is the answer?
- Overall (1-10): An overall assessment considering all the above criteria.

Do not include any explanations, markdown formatting, or additional text - return ONLY the valid JSON object.`;

        // Generation config
        const generationConfig = {
            temperature: 0.2, // Lower temperature for more consistent scoring
            topP: 0.8,
            topK: 40
        };

        // Call the Gemini API using the generative model
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig
        });

        // Extract the response text from the result
        let responseText = result.response.text();

        // Clean the response to remove potential formatting
        responseText = responseText.replace(/```json|```/g, '').trim();

        let analysis;
        try {
            // Parse the cleaned response as JSON
            analysis = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing the analysis response as JSON:', parseError.message);
            return res.status(500).json({
                error: 'The response from the API was not in the expected JSON format after cleaning. Please try again later.',
                details: responseText // Send the raw response for debugging
            });
        }

        // Validate the required fields exist
        const requiredFields = ['relevanceScore', 'completenessScore', 'clarityScore', 'accuracyScore', 'overallScore', 'feedback'];
        const missingFields = requiredFields.filter(field => !analysis[field]);
        
        if (missingFields.length > 0) {
            return res.status(500).json({
                error: `The response is missing required fields: ${missingFields.join(', ')}`,
                details: analysis
            });
        }

        // Send the analysis back to the client
        res.status(200).json(analysis);
    } catch (error) {
        console.error('Error analyzing answer:', error.message);
        if (error.message.includes('API key')) {
            return res.status(401).json({ error: 'Invalid API key. Please check your Gemini API key configuration.' });
        }
        res.status(500).json({ error: 'Failed to analyze answer. Please try again later.' });
    }
};

/**
 * Analyze all answers in a session and provide an overall assessment
 */
const analyzeInterview = async (req, res) => {
    try {
        const { questions, answers, topic, difficulty } = req.body;

        // Validate the input
        if (!questions || !answers || !Array.isArray(questions) || Object.keys(answers).length === 0) {
            return res.status(400).json({ error: 'Please provide questions array and answers object.' });
        }
        
        // Check if Gemini API is configured
        if (!genAI) {
            return res.status(501).json({ 
                error: 'Interview analysis requires Gemini API which is not configured.',
                feedback: 'Your answers have been recorded but automated feedback is not available.'
            });
        }

        // Get the model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro" }); // Using Pro model for more complex analysis

        // Prepare the Q&A pairs for analysis
        const qaPairs = questions.map((q, index) => {
            const answer = answers[index] || "No answer provided";
            return `Question ${index + 1}: ${q.question}\nAnswer: ${answer}`;
        }).join("\n\n");

        // Format the prompt for comprehensive analysis
        const prompt = `
You are an expert interview coach analyzing a complete technical interview.

Interview Context:
- Topic: ${topic || 'General'}
- Difficulty: ${difficulty || 'Medium'}

Below are the questions and the candidate's answers:

${qaPairs}

Please provide a comprehensive analysis of this interview performance.

IMPORTANT: Your response must be ONLY a valid JSON object with the following structure:
{
  "overallScore": number (1-10),
  "strengthAreas": ["string", "string", ...],
  "improvementAreas": ["string", "string", ...],
  "keyInsights": "string with overall assessment",
  "developmentPlan": "string with actionable advice for improvement",
  "questionAnalysis": {
    "0": {
      "score": number (1-10),
      "feedback": "string"
    },
    "1": {
      "score": number (1-10),
      "feedback": "string"
    },
    ...
  }
}

Do not include any explanations, markdown formatting, or additional text - return ONLY the valid JSON object.`;

        // Generation config
        const generationConfig = {
            temperature: 0.3,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048 // Allow for longer analysis
        };

        // Call the Gemini API
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig
        });

        // Extract and clean the response
        let responseText = result.response.text();
        responseText = responseText.replace(/```json|```/g, '').trim();

        let analysis;
        try {
            analysis = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing the interview analysis as JSON:', parseError.message);
            return res.status(500).json({
                error: 'The response was not in the expected JSON format. Please try again later.',
                details: responseText
            });
        }

        // Send the comprehensive analysis back to the client
        res.status(200).json(analysis);
    } catch (error) {
        console.error('Error analyzing interview:', error.message);
        if (error.message.includes('API key')) {
            return res.status(401).json({ error: 'Invalid API key. Please check your Gemini API key configuration.' });
        }
        res.status(500).json({ error: 'Failed to analyze interview. Please try again later.' });
    }
};

module.exports = { 
    getInterviewQuestions,
    analyzeAnswer,
    analyzeInterview
};