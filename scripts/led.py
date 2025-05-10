# from gpiozero import LED, Button
# from signal import pause

# # Pin configuration
# LED_PIN = 27       # GPIO pin connected to the LED
# IR_PIN = 17        # GPIO pin connected to the IR sensor's digital output

# # Initialize components
# led = LED(LED_PIN)
# ir_sensor = Button(IR_PIN, pull_up=False)  # Set pull_up=False if IR outputs LOW when triggered

# # Track LED state
# led_state = False

# # Function to toggle LED when hand is brought close
# def toggle_led_on_hand_detected():
#     global led_state
#     led_state = not led_state       # Toggle state
#     led.value = led_state           # Apply new state to LED
#     print(f"Hand detected. LED is now {'ON' if led_state else 'OFF'}.")

# # Attach the handler only to hand detection (when IR goes LOW)
# ir_sensor.when_pressed = toggle_led_on_hand_detected

# print("IR sensor ready. Bring hand close to toggle the LED.")

# # Keep script running
# pause()

from gpiozero import LED, Button
from signal import pause
from subprocess import Popen
import time
import os

# Pin configuration
LED_PIN = 27       # GPIO pin connected to the LED
IR_PIN = 17        # GPIO pin connected to the IR sensor's digital output

# Initialize components
led = LED(LED_PIN)
ir_sensor = Button(IR_PIN, pull_up=False)  # Set pull_up=False if IR outputs LOW when triggered

# Track LED state and camera process
led_state = False
camera_process = None

# Function to toggle LED and start camera stream
def toggle_led_and_camera():
    global led_state, camera_process

    led_state = not led_state
    led.value = led_state
    print(f"Hand detected. LED is now {'ON' if led_state else 'OFF'}.")

    if camera_process is None:
        print("Starting camera stream...")
        camera_process = Popen(
            "libcamera-vid -t 0 --width 640 --height 480 --framerate 30 --codec yuv420 --output - | "
            "ffmpeg -f rawvideo -pix_fmt yuv420p -s 640x480 -i - -f v4l2 -pix_fmt yuv420p /dev/video10",
            shell=True,
            preexec_fn=os.setsid  # Ensures we can kill the whole pipeline
        )

        # Optional: auto-stop after 15 seconds
        def stop_camera_later():
            global camera_process
            time.sleep(30)
            if camera_process:
                print("Stopping camera stream...")
                os.killpg(os.getpgid(camera_process.pid), 9)
                camera_process = None

        # Start stop timer in a background thread
        import threading
        threading.Thread(target=stop_camera_later, daemon=True).start()

# Attach handler to IR sensor
ir_sensor.when_pressed = toggle_led_and_camera

print("IR sensor ready. Bring hand close to toggle LED and start camera.")

# Keep script running
pause()
