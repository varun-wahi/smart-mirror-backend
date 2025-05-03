const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  faceDescriptor: {
    type: [Number],
    required: true
  },
  isPresent: {
    type: Boolean,
    default: false
  },
  lastAttendance: {
    type: Date,
    default: null
  },
  schedule: {
    type: Map,
    of: String,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create an index on email for faster queries
teacherSchema.index({ email: 1 });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;