const express = require("express");
const router = express.Router();
const { authenticateTeacher } = require("../controllers/teacher.controller.js");

// POST route for teacher authentication
router.post("/authenticate", authenticateTeacher);

module.exports = router;