const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const interviewRoutes = require('./routes/interview.routes.js');
const teacherRoutes = require('./routes/teacher.routes.js');
const lightRoutes = require('./routes/light.routes.js');
const cloudinaryRoutes = require('./routes/cloudinary.routes.js');
require('dotenv').config();
const cors = require("cors"); // Import cors
// Initialize question banks
require('./questionProvider').initializeQuestionBanks();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: "5mb" })); // or higher, e.g., 5mb

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas connected'))
.catch(err => console.error('MongoDB connection error:', err));

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

app.use('/api/cloudinary', cloudinaryRoutes);
// Server Start
const PORT = process.env.PORT || 5020;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));