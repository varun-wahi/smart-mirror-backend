// Mock teacher data
const mockTeachers = [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      email: 'sjohnson@school.edu',
      department: 'Science',
      faceDescriptor: [], // This would actually contain face descriptor data
      schedule: [
        {
          day: 'Monday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Biology', class: '12A' },
            { time: '9:45 - 10:45', subject: 'Chemistry', class: '11B' },
            { time: '11:00 - 12:00', subject: 'Biology Lab', class: '12A' },
            { time: '13:30 - 14:30', subject: 'Department Meeting', class: 'Staff Room' }
          ]
        },
        {
          day: 'Tuesday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Chemistry', class: '11A' },
            { time: '9:45 - 10:45', subject: 'Biology', class: '11C' },
            { time: '11:00 - 12:00', subject: 'Chemistry Lab', class: '11B' },
            { time: '13:30 - 14:30', subject: 'Staff Meeting', class: 'Conference Room' }
          ]
        },
        {
          day: 'Wednesday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Biology', class: '12A' },
            { time: '9:45 - 10:45', subject: 'Chemistry', class: '11B' },
            { time: '11:00 - 12:00', subject: 'Free Period', class: '-' },
            { time: '13:30 - 15:30', subject: 'Lab Preparation', class: 'Science Lab' }
          ]
        },
        {
          day: 'Thursday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Chemistry', class: '11A' },
            { time: '9:45 - 10:45', subject: 'Biology', class: '11C' },
            { time: '11:00 - 12:00', subject: 'Biology Lab', class: '11C' },
            { time: '13:30 - 14:30', subject: 'Mentoring', class: 'Office' }
          ]
        },
        {
          day: 'Friday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Biology', class: '12A' },
            { time: '9:45 - 10:45', subject: 'Free Period', class: '-' },
            { time: '11:00 - 12:00', subject: 'Chemistry', class: '11B' },
            { time: '13:30 - 14:30', subject: 'Faculty Development', class: 'Room 101' }
          ]
        }
      ],
      lastAttendance: new Date(),
      isPresent: true
    },
    {
      id: '2',
      name: 'Prof. Robert Chen',
      email: 'rchen@school.edu',
      department: 'Mathematics',
      faceDescriptor: [], // This would actually contain face descriptor data
      schedule: [
        {
          day: 'Monday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Calculus', class: '12B' },
            { time: '9:45 - 10:45', subject: 'Algebra', class: '11D' },
            { time: '11:00 - 12:00', subject: 'Free Period', class: '-' },
            { time: '13:30 - 14:30', subject: 'Advanced Math', class: '12C' }
          ]
        },
        {
          day: 'Tuesday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Statistics', class: '11E' },
            { time: '9:45 - 10:45', subject: 'Free Period', class: '-' },
            { time: '11:00 - 12:00', subject: 'Calculus', class: '12B' },
            { time: '13:30 - 14:30', subject: 'Staff Meeting', class: 'Conference Room' }
          ]
        },
        {
          day: 'Wednesday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Algebra', class: '11D' },
            { time: '9:45 - 10:45', subject: 'Calculus', class: '12B' },
            { time: '11:00 - 12:00', subject: 'Math Olympiad Training', class: 'Room 105' },
            { time: '13:30 - 14:30', subject: 'Department Meeting', class: 'Staff Room' }
          ]
        },
        {
          day: 'Thursday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Advanced Math', class: '12C' },
            { time: '9:45 - 10:45', subject: 'Statistics', class: '11E' },
            { time: '11:00 - 12:00', subject: 'Free Period', class: '-' },
            { time: '13:30 - 14:30', subject: 'Student Consulting', class: 'Office' }
          ]
        },
        {
          day: 'Friday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Calculus', class: '12B' },
            { time: '9:45 - 10:45', subject: 'Algebra', class: '11D' },
            { time: '11:00 - 12:00', subject: 'Statistics', class: '11E' },
            { time: '13:30 - 14:30', subject: 'Faculty Development', class: 'Room 101' }
          ]
        }
      ],
      lastAttendance: new Date(),
      isPresent: false
    },
    {
      id: '3',
      name: 'Ms. Emily Patel',
      email: 'epatel@school.edu',
      department: 'English',
      faceDescriptor: [], // This would actually contain face descriptor data
      schedule: [
        {
          day: 'Monday',
          periods: [
            { time: '8:30 - 9:30', subject: 'English Literature', class: '12D' },
            { time: '9:45 - 10:45', subject: 'Grammar', class: '10A' },
            { time: '11:00 - 12:00', subject: 'Creative Writing', class: '11F' },
            { time: '13:30 - 14:30', subject: 'Free Period', class: '-' }
          ]
        },
        {
          day: 'Tuesday',
          periods: [
            { time: '8:30 - 9:30', subject: 'English Literature', class: '12D' },
            { time: '9:45 - 10:45', subject: 'Grammar', class: '10B' },
            { time: '11:00 - 12:00', subject: 'Free Period', class: '-' },
            { time: '13:30 - 14:30', subject: 'Staff Meeting', class: 'Conference Room' }
          ]
        },
        {
          day: 'Wednesday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Grammar', class: '10A' },
            { time: '9:45 - 10:45', subject: 'English Literature', class: '12D' },
            { time: '11:00 - 12:00', subject: 'Creative Writing', class: '11F' },
            { time: '13:30 - 14:30', subject: 'Department Meeting', class: 'Staff Room' }
          ]
        },
        {
          day: 'Thursday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Grammar', class: '10B' },
            { time: '9:45 - 10:45', subject: 'English Literature', class: '12D' },
            { time: '11:00 - 12:00', subject: 'Drama Club', class: 'Auditorium' },
            { time: '13:30 - 14:30', subject: 'Free Period', class: '-' }
          ]
        },
        {
          day: 'Friday',
          periods: [
            { time: '8:30 - 9:30', subject: 'Creative Writing', class: '11F' },
            { time: '9:45 - 10:45', subject: 'Grammar', class: '10A' },
            { time: '11:00 - 12:00', subject: 'Grammar', class: '10B' },
            { time: '13:30 - 14:30', subject: 'Faculty Development', class: 'Room 101' }
          ]
        }
      ],
      lastAttendance: new Date(),
      isPresent: false
    }
  ];
  
  module.exports = { mockTeachers };