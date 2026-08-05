import { Student } from "../types";
import { getAccessToken } from "./auth";

export const exportStudentsToSheets = async (students: Student[]) => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // 1. Create a new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer \${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Alunos e-RaIA (\${new Date().toLocaleDateString('pt-BR')})`
      }
    })
  });

  if (!createRes.ok) {
    throw new Error('Failed to create spreadsheet');
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  // 2. Prepare Data
  const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Nível', 'Escola Atual', 'Curso Alvo'];
  const rows = students.map(s => [
    s.id,
    s.name,
    s.email,
    s.phone,
    s.level,
    s.currentSchool || '',
    s.profile360?.targetCourse || ''
  ]);

  const data = [headers, ...rows];

  // 3. Update the Spreadsheet with data
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Sheet1!A1:G\${data.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer \${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `Sheet1!A1:G\${data.length}`,
      majorDimension: 'ROWS',
      values: data,
    })
  });

  if (!updateRes.ok) {
    throw new Error('Failed to update spreadsheet data');
  }

  return `https://docs.google.com/spreadsheets/d/\${spreadsheetId}/edit`;
};
