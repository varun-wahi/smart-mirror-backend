const express = require('express');
const bodyParser = require('body-parser');
const interviewRoutes = require('./routes/interview.routes.js');
const teacherRoutes = require('./routes/teacher.routes.js');
const lightRoutes = require('./routes/light.routes.js');
require('dotenv').config();
const cors = require("cors"); // Import cors

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Default Route to Check Server
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running successfully!"
    });
});

// Routes
app.use('/api/interview', interviewRoutes);
app.use("/api/teacher", teacherRoutes);
app.use('/api/light', lightRoutes);

// Server Start
const PORT = process.env.PORT || 5020;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));