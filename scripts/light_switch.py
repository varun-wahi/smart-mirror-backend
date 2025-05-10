from gpiozero import LED
import sys

# GPIO pin for LED
LED_PIN = 27

# LED setup as output
led = LED(LED_PIN)

# Function to toggle LED based on argument passed
def toggle_led(state):
    if state == 'on':
        print("Turning LED on.")
        led.off()  # Turn on LED
    elif state == 'off':
        print("Turning LED off.")
        led.on()  # Turn off LED
    else:
        print("Invalid argument. Use 'on' or 'off'.")

# Check if argument is passed to the script
if len(sys.argv) > 1:
    toggle_led(sys.argv[1])
else:
    print("No argument provided. Use 'on' or 'off' to control the LED.")
