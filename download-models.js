const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_DIR = path.join(__dirname, 'models-face');

// Create directory if it doesn't exist
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

// Models to download
const MODELS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
];

// Base URL for models
const BASE_URL = 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights';

// Download function
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${filePath}`);
    
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath);
      reject(err);
    });
  });
}

// Download all models
async function downloadModels() {
  for (const model of MODELS) {
    const url = `${BASE_URL}/${model}`;
    const filePath = path.join(MODEL_DIR, model);
    
    try {
      await downloadFile(url, filePath);
      console.log(`Successfully downloaded ${model}`);
    } catch (error) {
      console.error(`Error downloading ${model}:`, error);
    }
  }
  console.log('All models downloaded!');
}

downloadModels();