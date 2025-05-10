import RPi.GPIO as GPIO
import time

# Set up the GPIO mode
GPIO.setmode(GPIO.BCM)

# Set GPIO pin 17 as an output pin
GPIO.setup(17, GPIO.OUT)

# Activate the relay by setting GPIO 17 high (turning the relay on)
GPIO.output(17, GPIO.HIGH)

# Wait for 5 seconds (you can adjust this duration)
time.sleep(5)

# Deactivate the relay by setting GPIO 17 low (turning the relay off)
GPIO.output(17, GPIO.LOW)

# Clean up the GPIO settings
GPIO.cleanup()
