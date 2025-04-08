const express = require('express');
const { getInterviewQuestions } = require('../controllers/interview.controller.js');
// const { getInterviewQuestions } = require('../controllers/interview_deepseek.controller.js');
const router = express.Router();

router.post('/questions', getInterviewQuestions);

module.exports = router;