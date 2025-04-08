// Add dotenv configuration at the top
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the GoogleGenerativeAI instance with the Gemini API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_SECRET_KEY);

// Function to generate interview questions
const getInterviewQuestions = async (req, res) => {
    try {
        const { topic, difficulty, numQuestions } = req.body;

        // Validate the input
        if (!topic || !difficulty || !numQuestions) {
            return res.status(400).json({ error: 'Please provide topic, difficulty, and numQuestions.' });
        }

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
        res.status(200).json({ questions });
    } catch (error) {
        console.error('Error generating interview questions:', error.message);
        if (error.message.includes('API key')) {
            return res.status(401).json({ error: 'Invalid API key. Please check your Gemini API key configuration.' });
        }
        res.status(500).json({ error: 'Failed to generate interview questions. Please try again later.' });
    }
};

module.exports = { getInterviewQuestions };