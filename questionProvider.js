// questionProvider.js
const fs = require('fs');
const path = require('path');

// Load the questions from JSON file
let questionBanks = {};

/**
 * Initialize question banks by loading them from JSON files
 */
function initializeQuestionBanks() {
    try {
        // Path to your question banks directory
        const questionBanksDir = path.join(__dirname, 'data', 'questionBanks');
        console.log('Available topics:', Object.keys(questionBanks));
        
        // Check if directory exists, if not create it
        if (!fs.existsSync(questionBanksDir)) {
            fs.mkdirSync(questionBanksDir, { recursive: true });
        }
        
        // Read all files in the question banks directory
        const files = fs.readdirSync(questionBanksDir);
        
        // Load each file as a question bank
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const topic = file.replace('.json', '');
                const filePath = path.join(questionBanksDir, file);
                const data = fs.readFileSync(filePath, 'utf8');
                questionBanks[topic] = JSON.parse(data);
            }
        });
        
        console.log(`Loaded ${Object.keys(questionBanks).length} question banks`);
    } catch (error) {
        console.error('Failed to initialize question banks:', error);
    }
}

/**
 * Get questions for a specific topic and difficulty level
 * 
 * @param {string} topic - The topic to get questions for
 * @param {string} difficulty - The difficulty level (easy, medium, hard)
 * @param {number} numQuestions - The number of questions to return
 * @returns {Array} An array of question objects with question and answer fields
 */
function getQuestions(topic, difficulty, numQuestions) {
    // Convert topic to lowercase for case-insensitive matching
    const normalizedTopic = topic.toLowerCase();
    
    // Find the closest matching topic in our question banks
    const availableTopics = Object.keys(questionBanks);
    const matchedTopic = availableTopics.find(t => 
        t.toLowerCase() === normalizedTopic || 
        t.toLowerCase().includes(normalizedTopic) || 
        normalizedTopic.includes(t.toLowerCase())
    );
    
    // If we have questions for this topic
    if (matchedTopic && questionBanks[matchedTopic]) {
        // Make sure difficulty is valid
        const normalizedDifficulty = difficulty.toLowerCase();
        let validDifficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty) 
            ? normalizedDifficulty 
            : 'medium';
            
        // Get questions for the chosen difficulty
        const questions = questionBanks[matchedTopic].questions[validDifficulty] || [];
        
        // If we have enough questions
        if (questions.length > 0) {
            // Randomly select the requested number of questions
            const shuffled = [...questions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(numQuestions, shuffled.length));
            
            // Format the questions in the expected format
            return selected.map(q => ({
                question: q.question,
                answer: q.ideal_answer || "No ideal answer provided."
            }));
        }
    }
    
    // Return empty array if no matching questions found
    return [];
}

/**
 * Add a new topic with questions to the question bank
 * 
 * @param {string} topic - The topic name
 * @param {Object} questions - Object containing questions by difficulty
 */
function addQuestionBank(topic, questions) {
    try {
        // Path to save the question bank
        const questionBanksDir = path.join(__dirname, 'data', 'questionBanks');
        
        // Ensure directory exists
        if (!fs.existsSync(questionBanksDir)) {
            fs.mkdirSync(questionBanksDir, { recursive: true });
        }
        
        // Save to memory
        questionBanks[topic] = questions;
        
        // Save to file
        const filePath = path.join(questionBanksDir, `${topic}.json`);
        fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
        
        console.log(`Added question bank for topic: ${topic}`);
    } catch (error) {
        console.error(`Failed to add question bank for topic ${topic}:`, error);
    }
}

/**
 * List all available topics
 * 
 * @returns {Array} List of available topics
 */
function listTopics() {
    return Object.keys(questionBanks);
}

// Initialize question banks when this module is loaded
initializeQuestionBanks();

module.exports = {
    getQuestions,
    addQuestionBank,
    listTopics,
    initializeQuestionBanks
};