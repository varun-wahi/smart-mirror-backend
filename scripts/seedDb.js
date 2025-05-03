// seed.js
const mongoose = require('mongoose');
const Teacher = require('../models/teacher.model.js');
require('dotenv').config();

// Replace with your MongoDB Atlas URI
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdbname';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});

const generateRandomDescriptor = () => {
  const descriptor = [];
  for (let i = 0; i < 128; i++) {
    descriptor.push(Math.random() * 2 - 1); // Random float between -1 and 1
  }
  return descriptor;
};

const seedTeachers = async () => {
  try {
    await Teacher.deleteMany({}); // Clear existing data

    const teachers = [
      {
        name: 'Alice Sharma',
        email: 'alice.sharma@example.com',
        department: 'Computer Science',
        schedule: 'MWF 10:00 - 11:00',
        faceDescriptor: generateRandomDescriptor()
      },
      {
        name: 'Bob Verma',
        email: 'bob.verma@example.com',
        department: 'Mathematics',
        schedule: 'TTh 14:00 - 15:30',
        faceDescriptor: generateRandomDescriptor()
      },
      {
        name: 'Catherine Singh',
        email: 'catherine.singh@example.com',
        department: 'Physics',
        schedule: 'MWF 09:00 - 10:30',
        faceDescriptor: generateRandomDescriptor()
      }
    ];

    await Teacher.insertMany(teachers);
    console.log('Seeded teacher data successfully');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.disconnect();
  }
};

seedTeachers();