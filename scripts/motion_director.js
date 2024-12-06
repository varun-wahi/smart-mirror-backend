const Gpio = require('onoff').Gpio;

const PIR_SENSOR_PIN = 17; // GPIO pin for PIR sensor
const LED_PIN = 27;       // GPIO pin for LED

const pirSensor = new Gpio(PIR_SENSOR_PIN, 'in', 'both'); // 'both' to detect rising and falling edges
const led = new Gpio(LED_PIN, 'out');                    // LED setup as output

console.log("PIR Sensor is warming up...");
setTimeout(() => {
    console.log("Ready");
}, 2000); // Give PIR sensor time to stabilize

pirSensor.watch((err, value) => {
    if (err) {
        console.error("Error:", err);
        return;
    }

    if (value === 1) {
        console.log("Motion detected! Turning on LED.");
        led.writeSync(1); // Turn on LED
        setTimeout(() => {
            led.writeSync(0); // Turn off LED after 30 seconds
            console.log("LED turned off.");
        }, 30000);
    } else {
        console.log("No motion.");
    }
});

// Clean up GPIO on exit
process.on('SIGINT', () => {
    pirSensor.unexport();
    led.unexport();
    console.log("GPIO cleanup done. Exiting.");
    process.exit();
});