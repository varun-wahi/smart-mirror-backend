const express = require('express');
const router = express.Router();

// Mock notices for development
const notices = [
  "Parent-Teacher Meeting on Friday at 4 PM",
  "Submit attendance reports by end of the week",
  "Holiday on Monday for Teacher's Day",
  "Staff meeting tomorrow at 3:30 PM",
  "Annual sports day next Wednesday"
];

// Get all notices
router.get('/', (req, res) => {
  res.status(200).json(notices);
});

module.exports = router;