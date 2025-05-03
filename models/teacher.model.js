const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  faceDescriptor: { type: [Number], required: true }, // Face recognition data
  schedule: [{
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], required: true },
    periods: [{
      time: { type: String, required: true },
      subject: { type: String, required: true },
      class: { type: String, required: true }
    }]
  }],
  lastAttendance: { type: Date },
  isPresent: { type: Boolean, default: false }
});

module.exports = mongoose.model('Teacher', teacherSchema);