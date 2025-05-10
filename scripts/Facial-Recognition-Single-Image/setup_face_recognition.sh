#!/bin/bash

echo "Setting up Face Recognition Backend..."

# Install required dependencies
echo "Installing dependencies..."
pip install flask flask-cors opencv-python face-recognition numpy picamera2

# Copy service file to systemd
echo "Setting up systemd service..."
sudo cp face-recognition.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable face-recognition.service
sudo systemctl start face-recognition.service

echo "Face Recognition backend setup complete!"
echo "Service running at http://localhost:5030"
echo "API endpoints:"
echo " - /video_feed  - MJPEG video stream"
echo " - /check_recognition  - Get recognition status"
echo " - /reset_recognition  - Reset current recognition"