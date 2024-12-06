const Gpio = require('onoff').Gpio;

// GPIO pin for LED
const LED_PIN = 27;
// GPIO pin for PIR sensor (commented out functionality for PIR sensor)
const PIR_SENSOR_PIN = 17;

// LED setup as output
const led = new Gpio(LED_PIN, 'out');

// PIR sensor setup (commented out for now)
// const pirSensor = new Gpio(PIR_SENSOR_PIN, 'in', 'both'); // 'both' to detect rising and falling edges

console.log("Ready to control LED.");

// Example of turning the LED on or off manually
const toggleLED = (state) => {
    if (state) {
        console.log("Turning LED on.");
        led.writeSync(1); // Turn on LED
    } else {
        console.log("Turning LED off.");
        led.writeSync(0); // Turn off LED
    }
};

// Test toggling the LED (manually replace `true` or `false` as needed)
// Replace this test block with your own control logic
setTimeout(() => toggleLED(true), 1000);  // Turn LED on after 1 second
setTimeout(() => toggleLED(false), 5000); // Turn LED off after 5 seconds

// Clean up GPIO on exit
process.on('SIGINT', () => {
    // pirSensor.unexport(); // Commented out PIR cleanup
    led.unexport();
    console.log("GPIO cleanup done. Exiting.");
    process.exit();
});