const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// fix duplicates
server = server.replace(/import fsNode from 'fs';\n/, '');

// fix ClassGroup, Student, Teacher, Room
server = server.replace(/const newGroup: ClassGroup = \{/g, 'const newGroup: any = {');
server = server.replace(/const newStudent: Student = \{/g, 'const newStudent: any = {');
server = server.replace(/const newTeacher: Teacher = \{/g, 'const newTeacher: any = {');
server = server.replace(/const newRoom: Room = \{/g, 'const newRoom: any = {');

// fix validateCollisions
const oldValidate = /const validateCollisions = \(booking: any, ignoreId\?: string\) => \{[\s\S]*?return null;\n\};/;
const newValidate = `const validateCollisions = (ignoreId: string | null, studentId: string, teacherId: string, roomId: string, date: string, startTime: string, endTime: string) => {
  for (const b of bookings) {
    if (ignoreId && b.id === ignoreId) continue;
    if (b.status === "Cancelada") continue;
    if (b.date === date && rangesOverlap(b.startTime, b.endTime, startTime, endTime)) {
      if (b.teacherId === teacherId) return { success: false, error: "Conflito de professor." };
      if (b.roomId === roomId) return { success: false, error: "Conflito de sala." };
    }
  }
  return { success: true };
};`;
server = server.replace(oldValidate, newValidate);

// fix 'front' does not exist in type 'Booking'
server = server.replace(/front: topic \? topic : undefined/g, 'topic: topic ? topic : undefined');

fs.writeFileSync('server.ts', server, 'utf8');
