const { spawn } = require('child_process');
const path = require('path');

function authenticateFaceNode(imagePath, knownFacesDir) {
  return new Promise((resolve, reject) => {
    const pythonPath = '/usr/bin/python3'; // Or use `which python3`
    const scriptPath = path.resolve(__dirname, 'authenticate_face.py');
    
    const process = spawn(pythonPath, [scriptPath, imagePath, knownFacesDir]);

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          const jsonResult = JSON.parse(output);
          resolve(jsonResult);
        } catch (err) {
          reject(new Error('Invalid JSON from Python: ' + output));
        }
      } else {
        reject(new Error('Python process exited with code ' + code + ': ' + errorOutput));
      }
    });
  });
}