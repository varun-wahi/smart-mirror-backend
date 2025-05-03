const path = require('path');
const fs = require('fs');
const canvas = require('canvas');
const faceapi = require('face-api.js');
const { Canvas, Image } = require('canvas');
const Teacher = require('../models/teacher.model');
const { createCanvas, Image: CanvasImage } = require('canvas');

// Patch nodejs environment for face-api.js
faceapi.env.monkeyPatch({ Canvas, Image });

// Load face recognition models
let modelsLoaded = false;
async function loadModels() {
  if (modelsLoaded) return;
  
  const MODEL_DIR = path.join(__dirname, '../models-face');
  
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR);
    modelsLoaded = true;
    console.log('Face recognition models loaded successfully');
  } catch (error) {
    console.error('Error loading face recognition models:', error);
    throw error;
  }
}

const initializeSystem = async (req, res) => {
  try {
    await loadModels();
    res.status(200).json({ message: 'Face recognition system initialized' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize face recognition system' });
  }
};

const verifyFace = async (req, res) => {
  try {
    await loadModels();
    
    // Get base64 image from request
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const image = await canvas.loadImage(buffer);
    
    // Detect faces in the image
    const detections = await faceapi.detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceDescriptors();
      
    if (!detections.length) {
      return res.status(400).json({ error: 'No face detected in the image' });
    }
    
    // Get all teachers' face descriptors from the database
    const teachers = await Teacher.find({}, 'name faceDescriptor');
    
    // Create a face matcher with the teachers' data
    const labeledDescriptors = teachers.map(teacher => {
      return new faceapi.LabeledFaceDescriptors(
        teacher._id.toString(),
        [new Float32Array(teacher.faceDescriptor)]
      );
    });
    
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 is the distance threshold
    
    // Find best match
    const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
    
    if (bestMatch.label === 'unknown') {
      return res.status(404).json({ error: 'Teacher not recognized' });
    }
    
    // Update teacher attendance
    const teacher = await Teacher.findById(bestMatch.label);
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
        schedule: teacher.schedule,
        lastAttendance: teacher.lastAttendance
      }
    });
    
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Face verification failed' });
  }
};

const registerFace = async (req, res) => {
  try {
    await loadModels();
    
    const { imageBase64, teacherId } = req.body;
    
    if (!imageBase64 || !teacherId) {
      return res.status(400).json({ error: 'Image and teacher ID required' });
    }
    
    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Process image
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const image = await canvas.loadImage(buffer);
    
    // Detect face in the image
    const detections = await faceapi.detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceDescriptors();
      
    if (!detections.length) {
      return res.status(400).json({ error: 'No face detected in the image' });
    }
    
    // Save face descriptor to teacher record
    teacher.faceDescriptor = Array.from(detections[0].descriptor);
    await teacher.save();
    
    res.status(200).json({ message: 'Face registered successfully' });
    
  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({ error: 'Face registration failed' });
  }
};

module.exports = {
    initializeSystem,
    verifyFace,
    registerFace,
};