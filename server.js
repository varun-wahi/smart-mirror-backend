const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const interviewRoutes = require('./routes/interview.routes.js');
const teacherRoutes = require('./routes/teacher.routes.js');
const lightRoutes = require('./routes/light.routes.js');
const cloudinaryRoutes = require('./routes/cloudinary.routes.js');
require('dotenv').config();
const cors = require("cors"); // Import cors
const { spawn } = require('child_process');
const path = require('path'); // Import path module
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



// Path to your Python script - update this to the correct path
const pythonScriptPath = path.join(__dirname, 'controllers' ,'face_recognition', 'app.py');

// Start the Python face recognition script as a child process
let pythonProcess = null;

function startPythonFaceRecognition() {
  console.log('Starting face recognition service...');
  
  // Use python3 or python depending on your environment
  pythonProcess = spawn('python3.10', [pythonScriptPath]);
  
  // Handle Python process output
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Face Recognition: ${data.toString().trim()}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Face Recognition Error: ${data.toString().trim()}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Face recognition process exited with code ${code}`);
    
    // Optionally restart if it crashes
    if (code !== 0 && code !== null) {
      console.log('Attempting to restart face recognition...');
      setTimeout(startPythonFaceRecognition, 5000); // Wait 5 seconds before restarting
    }
  });
  
  pythonProcess.on('error', (err) => {
    console.error('Failed to start face recognition process:', err);
  });
}

// Start the Python process when Node.js server starts
startPythonFaceRecognition();

// Gracefully handle shutdown and kill Python process when Node.js exits
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  if (pythonProcess) {
    console.log('Terminating face recognition process...');
    pythonProcess.kill();
  }
  process.exit(0);
});


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