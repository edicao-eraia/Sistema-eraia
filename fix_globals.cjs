const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const globals = `
let students: any[] = [];
let teachers: any[] = [];
let rooms: any[] = [];
let classGroups: any[] = [];
let bookings: any[] = [];
let systemBackups: any[] = [];
let studentDrafts: any[] = [];
let guardianDrafts: any[] = [];
let guardians: any[] = [];

let mutexLocked = false;
const acquireMutex = async () => {
  while (mutexLocked) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  mutexLocked = true;
};
const releaseMutex = () => {
  mutexLocked = false;
};

const getDayOfWeek = (dateString: string) => {
  const date = new Date(dateString + "T00:00:00");
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return days[date.getDay()];
};

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const rangesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  return timeToMinutes(start1) < timeToMinutes(end2) && timeToMinutes(end1) > timeToMinutes(start2);
};

const validateCollisions = (booking: any, ignoreId?: string) => {
  for (const b of bookings) {
    if (ignoreId && b.id === ignoreId) continue;
    if (b.status === "Cancelada") continue;
    if (b.date === booking.date && rangesOverlap(b.startTime, b.endTime, booking.startTime, booking.endTime)) {
      if (b.teacherId === booking.teacherId) return "Conflito de professor.";
      if (b.roomId === booking.roomId) return "Conflito de sala.";
    }
  }
  return null;
};

interface Booking {
  id: string;
  studentId?: string;
  teacherId?: string;
  roomId?: string;
  subject?: string;
  topic?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
`;

if (!server.includes('let students: any[] = [];')) {
  server = server.replace('let users: any[] = [];', 'let users: any[] = [];\n' + globals);
}

fs.writeFileSync('server.ts', server, 'utf8');
