/**
 * Command-line tool to test the Telegram PDF functionality
 * Save this as test-telegram.js
 */
require('dotenv').config();
const fs = require('fs');
const FormData = require('form-data');
// const fetch = require('node-fetch');
// import fetch from 'node-fetch';
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const PDFDocument = require('pdfkit');

// Import the PDF generator function
// const { generatePDF } = require('/Users/varunwahi/Development/Interview_Prep/Backend/controllers/interview.controller.js'); // Update path as needed

// Sample report data (similar to what your API would receive)
const sampleReport = {
    interviewTopic: "computer-networks",
    difficulty: "Easy",
    overallScore: 7,
    strengthAreas: ["Basic knowledge of networking terms"],
    improvementAreas: [
        "Basic Networking Concepts",
        "Understanding of IP Addressing",
        "Knowledge of Network Devices",
        "Communication Skills"
    ],
    keyInsights: "The candidate demonstrated a very limited understanding of basic networking concepts.",
    developmentPlan: "The candidate needs to dedicate significant time to studying fundamental networking concepts.",
    questions: [
        {
            question: "What is a subnet?",
            answer: "A subnet is a smaller network within a larger network."
        },
        {
            question: "What is a MAC address?",
            answer: ""
        }
    ],
    answers: [
        "So, subnet is a small network within a large network.",
        ""
    ],
    questionAnalysis: {
        "0": {
            score: 7,
            feedback: "The answer is relevant but lacks depth and detail."
        }
    }
};

const generatePDF = (report) => {
    const doc = new PDFDocument({ margin: 50 });
    
    // Add metadata
    doc.info.Title = `Interview Results: ${report.interviewTopic}`;
    doc.info.Author = 'Interview Assistant';
    
    // Add header
    doc.fontSize(25).text('Interview Analysis Report', { align: 'center' });
    doc.moveDown();
    
    // Add interview metadata
    doc.fontSize(14).text(`Topic: ${report.interviewTopic}`);
    doc.fontSize(14).text(`Difficulty: ${report.difficulty}`);
    doc.fontSize(14).text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    // Add overall scores section
    doc.fontSize(18).text('Overall Assessment', { underline: true });
    doc.fontSize(12).text(`Overall Score: ${report.overallScore}/10`);
    doc.moveDown();
    
    // Add strength areas
    doc.fontSize(16).text('Strength Areas:');
    if (report.strengthAreas && report.strengthAreas.length > 0) {
        report.strengthAreas.forEach((strength, i) => {
            doc.fontSize(12).text(`${i + 1}. ${strength}`);
        });
    } else {
        doc.fontSize(12).text("None identified.");
    }
    doc.moveDown();
    
    // Add improvement areas
    doc.fontSize(16).text('Areas for Improvement:');
    if (report.improvementAreas && report.improvementAreas.length > 0) {
        report.improvementAreas.forEach((area, i) => {
            doc.fontSize(12).text(`${i + 1}. ${area}`);
        });
    } else {
        doc.fontSize(12).text("None identified.");
    }
    doc.moveDown();
    
    // Add key insights
    doc.fontSize(16).text('Key Insights:');
    doc.fontSize(12).text(report.keyInsights || "No insights provided.");
    doc.moveDown();
    
    // Add development plan
    doc.fontSize(16).text('Development Plan:');
    doc.fontSize(12).text(report.developmentPlan || "No development plan provided.");
    doc.moveDown(2);
    
    // Add individual question analysis
    doc.fontSize(18).text('Question-by-Question Analysis', { underline: true });
    doc.moveDown();
    
    // Add each question and its analysis
    if (report.questions && report.questionAnalysis) {
        Object.keys(report.questionAnalysis).forEach((questionIndex) => {
            const index = parseInt(questionIndex);
            if (report.questions[index]) {
                const question = report.questions[index];
                const answer = report.answers[index] || "No answer provided";
                const analysis = report.questionAnalysis[questionIndex];
                
                doc.fontSize(14).text(`Question ${index + 1}: ${question.question}`);
                doc.fontSize(12).text(`Answer: ${answer}`);
                if (analysis) {
                    doc.fontSize(12).text(`Score: ${analysis.score || '?'}/10`);
                    doc.fontSize(12).text(`Feedback: ${analysis.feedback || 'No feedback provided'}`);
                }
                doc.moveDown(2);
            }
        });
    } else {
        doc.fontSize(12).text("No question analysis available.");
    }
    
    return doc;
};


/**
 * Test function to generate and save a PDF
 */
async function testGeneratePDF() {
    try {
        console.log('Generating PDF...');
        const doc = generatePDF(sampleReport);
        
        // Write to a file to test PDF generation
        const writeStream = fs.createWriteStream('test-report.pdf');
        doc.pipe(writeStream);
        
        doc.end();
        
        writeStream.on('finish', () => {
            console.log('PDF successfully generated and saved as test-report.pdf');
        });
        
        writeStream.on('error', (err) => {
            console.error('Error writing PDF file:', err);
        });
    } catch (error) {
        console.error('PDF generation failed:', error);
    }
}

/**
 * Test function to send a PDF to Telegram
 */
async function testSendToTelegram() {
    try {
        // if (!process.env.TELEGRAM_BOT_TOKEN) {
        //     console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
        //     return;
        // }
        
        if (!process.argv[2]) {
            console.error('Please provide a Telegram chat ID as a command line argument');
            console.log('Usage: node test-telegram.js <telegram_chat_id>');
            return;
        }
        
        const chatId = process.argv[2];
        
        console.log('Generating PDF...');
        const doc = generatePDF(sampleReport);
        
        // Collect PDF data in a buffer
        console.log('Creating PDF buffer...');
        const pdfBuffer = await new Promise((resolve) => {
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.end();
        });
        
        console.log(`PDF buffer created, size: ${pdfBuffer.length} bytes`);
        
        // Send to Telegram
        console.log(`Sending to Telegram chat ID: ${chatId}...`);
        
        const botToken = '8126908772:AAHLwYm7eQn0s53rIRtA_nVotTqPImJbXtA';
        const form = new FormData();
        
        form.append('chat_id', chatId);
        
        // Use a temporary file approach
        const tempFilePath = 'temp-report.pdf';
        fs.writeFileSync(tempFilePath, pdfBuffer);
        
        // Append file from disk
        form.append('document', fs.createReadStream(tempFilePath));
        form.append('caption', `Interview Results: ${sampleReport.interviewTopic}`);
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            body: form
        });
        
        const result = await response.json();
        
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        
        if (result.ok) {
            console.log('PDF sent successfully to Telegram!');
            console.log('Message ID:', result.result.message_id);
        } else {
            console.error('Failed to send PDF to Telegram:', result.description);
        }
    } catch (error) {
        console.error('Error in test:', error);
    }
}

// Choose which test to run
if (process.argv.includes('--pdf-only')) {
    testGeneratePDF();
} else {
    testSendToTelegram();
}

// Instructions:
// 1. Save this file as test-telegram.js 
// 2. Create a .env file with TELEGRAM_BOT_TOKEN=your_bot_token
// 3. Run with: node test-telegram.js <telegram_chat_id>
// 4. To test PDF generation only: node test-telegram.js --pdf-only