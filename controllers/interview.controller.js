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

        // Construct the prompt
        const prompt = `Generate ${numQuestions} interview questions on the topic '${topic}' at '${difficulty}' difficulty level. Provide answers for each question. Return the response as a JSON array where each item is a dictionary with "question" and "answer" keys, like this:
        [
            {
                "question": "Explain the difference between 'list.append()' and 'list.extend()'. Provide examples.",
                "answer": "append() adds its argument as a single element to the end of a list, even if the argument is another list. extend() iterates over its argument and adds each element of the iterable to the end of the list."
            }
        ]`;

        // Call the Gemini API using the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);

        // Clean the response to remove unwanted characters
        let responseText = result.response.text();

        // Remove potential code block markers like ```json or ```
        responseText = responseText.replace(/```json|```/g, '').trim();

        let questions;
        try {
            // Parse the cleaned response as JSON
            questions = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing the cleaned response as JSON:', parseError.message);
            return res.status(500).json({
                error: 'The response from the API was not in the expected JSON format after cleaning. Please try again later.',
                details: responseText // Optional: Send the raw response for debugging
            });
        }

        // Validate the JSON structure
        if (!Array.isArray(questions) || questions.some(q => !q.question || !q.answer)) {
            return res.status(500).json({
                error: 'The response from the API did not contain the expected structure. Please try again later.',
                details: questions // Optional: Send the parsed response for debugging
            });
        }

        // Send the questions back to the client
        res.status(200).json({ questions });
    } catch (error) {
        console.error('Error generating interview questions:', error.message);
        res.status(500).json({ error: 'Failed to generate interview questions. Please try again later.' });
    }
};

module.exports = { getInterviewQuestions };