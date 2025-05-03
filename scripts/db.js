const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'teachers.db'));

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    department TEXT,
    schedule TEXT,
    faceDescriptor TEXT,
    lastAttendance TEXT,
    isPresent INTEGER DEFAULT 0
  );
`);

module.exports = db;