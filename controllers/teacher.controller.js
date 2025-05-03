const path = require('path');
const fs = require('fs');
const Teacher = require('../models/teacher.model');

// Path for face-api models
const MODELS_PATH = path.join(__dirname, '../models');

// Track initialization status
let isInitialized = false;

// Initialize face-api models
async function initializeModels() {
  try {
    // Make sure models directory exists
    if (!fs.existsSync(MODELS_PATH)) {
      fs.mkdirSync(MODELS_PATH, { recursive: true });
    }
    
    // Configure faceapi to use tfjs-node
    await faceapi.tf.setBackend('tensorflow');
    await faceapi.tf.enableProdMode();
    await faceapi.tf.ready();
    
    // Load models
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);

    isInitialized = true;
    console.log('Face API models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face-api models:', error);
    return false;
  }
}

// Convert base64 to buffer
function base64ToBuffer(base64Image) {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Initialize the face recognition system
const initializeSystem = async (req, res) => {
  try {
    const success = await initializeModels();
    if (success) {
      res.status(200).json({ message: 'Face recognition system initialized successfully' });
    } else {
      res.status(500).json({ error: 'Failed to initialize face recognition system' });
    }
  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize face recognition system' });
  }
};

// Verify a face against stored teacher faces
const verifyFace = async (req, res) => {
  try {
    // Ensure models are loaded
    if (!isInitialized) {
      await initializeModels();
    }
    
    // Get base64 image from request
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Convert base64 to buffer
    const imageBuffer = base64ToBuffer(imageBase64);
    
    // Convert buffer to tensor
    const tensor = tf.node.decodeImage(imageBuffer);
    
    // Detect faces
    const detections = await faceapi
      .detectAllFaces(tensor)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    // Free memory
    tensor.dispose();
    
    if (detections.length === 0) {
      return res.status(400).json({ error: 'No face detected in the image' });
    }
    
    // Get the descriptor from the first detected face
    const queryDescriptor = detections[0].descriptor;
    
    // Get all teachers from the database
    const teachers = await Teacher.find({}, 'name email department faceDescriptor');
    
    // Create labeled face descriptors for face matcher
    const labeledDescriptors = teachers.map(teacher => {
      return new faceapi.LabeledFaceDescriptors(
        teacher._id.toString(),
        [new Float32Array(teacher.faceDescriptor)]
      );
    });
    
    // No teachers found
    if (labeledDescriptors.length === 0) {
      return res.status(404).json({ error: 'No registered teachers found' });
    }
    
    // Create face matcher with lower distance threshold (0.5 is more strict than 0.6)
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);
    
    // Find best match
    const bestMatch = faceMatcher.findBestMatch(queryDescriptor);
    
    if (bestMatch.label === 'unknown') {
      return res.status(404).json({ error: 'Teacher not recognized' });
    }
    
    // Update teacher attendance
    const teacher = await Teacher.findById(bestMatch.label);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher record not found' });
    }
    
    teacher.lastAttendance = new Date();
    teacher.isPresent = true;
    await teacher.save();
    
    // Return teacher data
    res.status(200).json({
      recognized: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        lastAttendance: teacher.lastAttendance
      }
    });
    
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Face verification failed: ' + error.message });
  }
};

// Register a teacher face
const registerFace = async (req, res) => {
  try {
    // Ensure models are loaded
    if (!isInitialized) {
      await initializeModels();
    }
    
    const { imageBase64, teacherId, name, email, department } = req.body;
    
    if (!imageBase64 || !name || !email || !department) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Convert base64 to buffer
    const imageBuffer = base64ToBuffer(imageBase64);
    
    // Convert buffer to tensor
    const tensor = tf.node.decodeImage(imageBuffer);
    
    // Detect faces
    const detections = await faceapi
      .detectSingleFace(tensor)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    // Free memory
    tensor.dispose();
    
    if (!detections) {
      return res.status(400).json({ error: 'No face detected in the image' });
    }
    
    // Get face descriptor as an array
    const descriptorArray = Array.from(detections.descriptor);
    
    // Update or create teacher record
    let teacher;
    
    if (teacherId) {
      // Update existing teacher
      teacher = await Teacher.findById(teacherId);
      
      if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      
      teacher.name = name;
      teacher.email = email;
      teacher.department = department;
      teacher.faceDescriptor = descriptorArray;
    } else {
      // Create new teacher
      teacher = new Teacher({
        name,
        email,
        department,
        faceDescriptor: descriptorArray,
        isPresent: false
      });
    }
    
    await teacher.save();
    
    res.status(200).json({
      success: true,
      message: 'Face registered successfully',
      teacherId: teacher._id
    });
    
  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({ error: 'Face registration failed: ' + error.message });
  }
};

// Download models if not exists
const downloadModels = async (req, res) => {
  try {
    // Check if models already exist
    const ssdModelPath = path.join(MODELS_PATH, 'ssd_mobilenetv1_model-weights_manifest.json');
    
    if (fs.existsSync(ssdModelPath)) {
      return res.status(200).json({ message: 'Models already exist' });
    }
    
    // Create models directory if it doesn't exist
    if (!fs.existsSync(MODELS_PATH)) {
      fs.mkdirSync(MODELS_PATH, { recursive: true });
    }
    
    // URLs for models
    const modelUrls = {
      ssdMobilenetv1: 'https://github.com/vladmandic/face-api/blob/master/model/ssd_mobilenetv1_model-weights_manifest.json',
      faceLandmark68Net: 'https://github.com/vladmandic/face-api/blob/master/model/face_landmark_68_model-weights_manifest.json',
      faceRecognitionNet: 'https://github.com/vladmandic/face-api/blob/master/model/face_recognition_model-weights_manifest.json'
    };
    
    // Instructions for manual download
    res.status(200).json({
      message: 'Please download models manually from the following URLs and place them in the models directory:',
      modelUrls,
      modelsPath: MODELS_PATH
    });
    
  } catch (error) {
    console.error('Model download error:', error);
    res.status(500).json({ error: 'Failed to check/download models' });
  }
};

module.exports = {
  initializeSystem,
  verifyFace,
  registerFace,
  downloadModels
};