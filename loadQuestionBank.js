// Script to load the initial question bank from a JSON file
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const questionProvider = require('./questionProvider');

/**
 * Load a question bank from a file
 * @param {string} filePath - Path to the question bank JSON file
 */
async function loadQuestionBankFromFile(filePath) {
    try {
        // Read the file
        const data = fs.readFileSync(filePath, 'utf8');
        const questionBank = JSON.parse(data);
        
        // Extract topic from the question bank
        const topic = questionBank.topic;
        
        if (!topic) {
            console.error('Question bank must have a "topic" field');
            return;
        }
        
        // Add the question bank
        questionProvider.addQuestionBank(topic, questionBank);
        console.log(`Successfully loaded question bank for topic: ${topic}`);
    } catch (error) {
        console.error('Error loading question bank:', error);
    }
}

/**
 * Main function to load all question banks
 */
async function loadAllQuestionBanks() {
    try {
        // Define the paths to your question bank files
        const questionBanksDir = path.join(__dirname, 'data', 'questionBanks');
        
        // Ensure directory exists
        if (!fs.existsSync(questionBanksDir)) {
            fs.mkdirSync(questionBanksDir, { recursive: true });
            console.log(`Created directory: ${questionBanksDir}`);
        }
        
        // Example: Load Operating Systems question bank provided in your paste-2.txt
        const osQuestionsPath = path.join(questionBanksDir, 'operating-systems.json');
        
        // If the file doesn't exist yet, create it from your data
        if (!fs.existsSync(osQuestionsPath)) {
            // This assumes you have the OS questions data in a variable called osQuestions
            // In a real scenario, you might load this from a file or API
            const osQuestionsData = {
                "topic": "Operating Systems",
                "questions": {
                    "easy": [
                        // Questions would be here - this is just a placeholder
                        // You would populate this from your paste-2.txt file
                    ],
                    "medium": [],
                    "hard": []
                }
            };
            
            // Write this initial data to the file
            fs.writeFileSync(osQuestionsPath, JSON.stringify(osQuestionsData, null, 2));
            console.log(`Created initial question bank file: ${osQuestionsPath}`);
        }
        
        // Load all question banks from the directory
        const files = fs.readdirSync(questionBanksDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                await loadQuestionBankFromFile(path.join(questionBanksDir, file));
            }
        }
        
        console.log('Finished loading all question banks');
    } catch (error) {
        console.error('Error in loadAllQuestionBanks:', error);
    }
}

// Run the loader
loadAllQuestionBanks().then(() => {
    console.log('Question bank loading process completed');
    // You might want to add process.exit(0) here if this is a standalone script
});

module.exports = { loadAllQuestionBanks };