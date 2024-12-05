const express = require('express');
const bodyParser = require('body-parser');
const interviewRoutes = require('./routes/interview.routes.js');
const teacherRoutes = require('./routes/teacher.routes.js');
require('dotenv').config();

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes

app.use('/api/interview', interviewRoutes);
app.use("/api/teacher", teacherRoutes);

// Server Start
const PORT = process.env.PORT || 5020;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));