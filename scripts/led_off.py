from gpiozero import LED
from signal import pause

# Pin configuration
LED_PIN = 27  # GPIO pin for the LED
led = LED(LED_PIN)

# Turn on the LED
led.off()
print("LED on pin 27 is now ON.")

# Keep the script running
pause()
