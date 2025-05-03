// Script to convert the OS questions from paste-2.txt format to the proper question bank format
require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Convert the OS questions JSON to our question bank format
 */
function convertOSQuestions() {
    try {
        // Read the OS questions JSON from paste-2.txt
        const osQuestionsPath = path.join(__dirname, 'paste-2.txt');
        const data = fs.readFileSync(osQuestionsPath, 'utf8');
        
        // Parse the JSON data
        const osData = JSON.parse(data);
        
        // Create the question bank structure
        const questionBank = {
            topic: osData.topic,
            questions: {
                easy: osData.questions.easy.map(q => ({
                    id: q.id,
                    question: q.question,
                    ideal_answer: q.ideal_answer,
                    keywords: q.keywords
                })),
                medium: osData.questions.medium.map(q => ({
                    id: q.id,
                    question: q.question,
                    ideal_answer: q.ideal_answer,
                    keywords: q.keywords
                })),
                hard: osData.questions.hard.map(q => ({
                    id: q.id,
                    question: q.question,
                    ideal_answer: q.ideal_answer,
                    keywords: q.keywords
                }))
            }
        };
        
        // Ensure directory exists
        const questionBanksDir = path.join(__dirname, 'data', 'questionBanks');
        if (!fs.existsSync(questionBanksDir)) {
            fs.mkdirSync(questionBanksDir, { recursive: true });
        }
        
        // Save the converted question bank
        const outputPath = path.join(questionBanksDir, 'operating-systems.json');
        fs.writeFileSync(outputPath, JSON.stringify(questionBank, null, 2));
        
        console.log(`Successfully converted OS questions and saved to ${outputPath}`);
    } catch (error) {
        console.error('Error converting OS questions:', error);
    }
}

/**
 * Main function to convert question formats
 */
async function convertAllQuestionFormats() {
    try {
        // Convert OS questions
        convertOSQuestions();
        
        console.log('Finished converting all question formats');
    } catch (error) {
        console.error('Error in convertAllQuestionFormats:', error);
    }
}

// Run the converter
convertAllQuestionFormats().then(() => {
    console.log('Question format conversion process completed');
    // You might want to add process.exit(0) here if this is a standalone script
});

module.exports = { convertAllQuestionFormats };