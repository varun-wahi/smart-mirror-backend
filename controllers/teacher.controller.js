const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

exports.authenticateTeacher = async (req, res) => {
    try {
        const { faceData } = req.body;

        if (!faceData) {
            return res.status(400).json({
                success: false,
                message: "Face data is required for authentication",
            });
        }

        // Save the base64 image data as a temporary file
        const tempImagePath = path.join(__dirname, "../temp/received_face.jpg");
        const base64Data = faceData.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(tempImagePath, Buffer.from(base64Data, "base64"));

        // Path to the Python script
        const pythonScriptPath = path.join(__dirname, "../scripts/face_recognition.py");

        // Spawn a Python process
        const pythonProcess = spawn("python3", [pythonScriptPath, tempImagePath]);

        let output = "";
        let errorOutput = "";

        // Collect output from Python script
        pythonProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        // Collect error output
        pythonProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        // Handle script completion
        pythonProcess.on("close", (code) => {
            // Remove the temporary image file
            fs.unlinkSync(tempImagePath);

            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    if (result.success) {
                        res.status(200).json(result);
                    } else {
                        res.status(401).json(result);
                    }
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        message: "Invalid response from face recognition script.",
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    message: `Face recognition script failed with code ${code}. Error: ${errorOutput}`,
                });
            }
        });
    } catch (error) {
        console.error("Error in authenticateTeacher:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error occurred during authentication.",
        });
    }
};