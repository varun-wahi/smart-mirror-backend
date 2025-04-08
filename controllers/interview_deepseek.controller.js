const axios = require('axios');

// Function to generate interview questions using DeepSeek API
const getInterviewQuestions = async (req, res) => {
    try {
        const { topic, difficulty, numQuestions } = req.body;

        if (!topic || !difficulty || !numQuestions) {
            return res.status(400).json({ error: 'Please provide topic, difficulty, and numQuestions.' });
        }

        const prompt = `Generate ${numQuestions} interview questions on the topic '${topic}' at '${difficulty}' difficulty level. Provide answers for each question. Return the response as a JSON array where each item is a dictionary with "question" and "answer" keys, like this:
        [
            {
                "question": "Explain the difference between 'list.append()' and 'list.extend()'. Provide examples.",
                "answer": "append() adds its argument as a single element to the end of a list, even if the argument is another list. extend() iterates over its argument and adds each element of the iterable to the end of the list."
            }
        ]`;

        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat', // or use 'deepseek-coder' if appropriate
                messages: [
                    { role: 'system', content: 'You are an expert interview question generator.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.DEEPSEEK_SECRET_KEY}` // Make sure this env variable is set
                }
            }
        );

        const message = response.data.choices[0].message.content;

        // Clean response (in case it includes ```json)
        const cleanedText = message.replace(/```json|```/g, '').trim();

        let questions;
        try {
            questions = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError.message);
            return res.status(500).json({
                error: 'Failed to parse DeepSeek API response as JSON.',
                details: cleanedText
            });
        }

        // Validate structure
        if (!Array.isArray(questions) || questions.some(q => !q.question || !q.answer)) {
            return res.status(500).json({
                error: 'The response did not contain the expected structure.',
                details: questions
            });
        }

        res.status(200).json({ questions });

    } catch (error) {
        console.error('Error generating questions:', error.message);
        res.status(500).json({ error: 'Failed to generate interview questions.' });
    }
};

module.exports = { getInterviewQuestions };