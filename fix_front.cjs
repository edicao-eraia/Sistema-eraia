const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(/interface Booking \{[\s\S]*?updatedAt\?: string;\n\}/, `interface Booking {
  id: string;
  studentId?: string;
  teacherId?: string;
  roomId?: string;
  subject?: string;
  topic?: string;
  front?: string;
  topicFinished?: boolean;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}`);

fs.writeFileSync('server.ts', server, 'utf8');
