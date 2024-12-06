const { exec } = require('child_process');

let motionProcess = null;

// Start motion detection
exports.startMotionDetection = (req, res) => {
    if (motionProcess) {
        return res.status(400).json({
            success: false,
            message: "Motion detection is already running.",
        });
    }

    motionProcess = exec('sudo node motion_detector.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            motionProcess = null;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Stdout: ${stdout}`);
    });

    res.json({
        success: true,
        message: "Motion detection started.",
    });
};

// Stop motion detection
exports.stopMotionDetection = (req, res) => {
    if (!motionProcess) {
        return res.status(400).json({
            success: false,
            message: "Motion detection is not running.",
        });
    }

    motionProcess.kill();
    motionProcess = null;

    res.json({
        success: true,
        message: "Motion detection stopped.",
    });
};