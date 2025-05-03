const express = require('express');
const { getInterviewQuestions, analyzeAnswer, analyzeInterview } = require('../controllers/interview.controller.js');
// const { getInterviewQuestions } = require('../controllers/interview_deepseek.controller.js');
const router = express.Router();

router.post('/questions', getInterviewQuestions);
router.post('/analyze-answer', analyzeAnswer);
router.post('/analyze-interview', analyzeInterview);

module.exports = router;