const { exec } = require('child_process');

let lightProcess = null;

// Start light control
exports.startLightControl = (req, res) => {
    if (lightProcess) {
        return res.status(400).json({
            success: false,
            message: "Light control is already running.",
        });
    }

    // Start the light control script
    lightProcess = exec('sudo node light_control.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            lightProcess = null;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Stdout: ${stdout}`);
    });

    res.json({
        success: true,
        message: "Light control started.",
    });
};

// Stop light control
exports.stopLightControl = (req, res) => {
    if (!lightProcess) {
        return res.status(400).json({
            success: false,
            message: "Light control is not running.",
        });
    }

    // Stop the light control script
    lightProcess.kill();
    lightProcess = null;

    res.json({
        success: true,
        message: "Light control stopped.",
    });
};