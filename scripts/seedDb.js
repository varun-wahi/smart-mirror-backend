const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Teacher = require('../models/Teacher');
const { mockTeachers } = require('../mockData');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Clear existing teachers
    await Teacher.deleteMany({});
    
    // Insert mock teachers
    await Teacher.insertMany(mockTeachers.map(teacher => {
      // Remove id field as MongoDB will create its own _id
      const { id, ...teacherData } = teacher;
      return teacherData;
    }));
    
    console.log('Database seeded successfully');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error seeding database:', err);
    mongoose.disconnect();
  });