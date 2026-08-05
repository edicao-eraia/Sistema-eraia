import { 
  createStudentInFirebase, 
  createGuardianInFirebase, 
  createTeacherInFirebase, 
  createRoomInFirebase, 
  createClassGroupInFirebase 
} from './db';
import { Student, Teacher, Guardian, Room, ClassGroup } from '../types';
import toast from 'react-hot-toast';

export async function seedDatabaseForTesting(userId: string) {
  if (!userId) {
    toast.error('Usuário não autenticado para criar dados de teste.');
    return;
  }
  
  try {
    toast.loading('Criando dados de teste...', { id: 'seed' });
    
    // 1. Criar Professores
    const profMat = await createTeacherInFirebase(userId, {
      name: 'Professor Matemática',
      email: 'matematica@teste.com',
      subject: 'Matemática',
      availability: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }, // Seg
        { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' }  // Qua
      ],
      hourlyRateIndividual: 80,
      hourlyRateGroup: 120
    });

    const profFis = await createTeacherInFirebase(userId, {
      name: 'Professor Física',
      email: 'fisica@teste.com',
      subject: 'Física',
      availability: [
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' }, // Ter
        { dayOfWeek: 4, startTime: '14:00', endTime: '18:00' }  // Qui
      ],
      hourlyRateIndividual: 85,
      hourlyRateGroup: 130
    });

    const profQui = await createTeacherInFirebase(userId, {
      name: 'Professor Química',
      email: 'quimica@teste.com',
      subject: 'Química',
      availability: [
        { dayOfWeek: 5, startTime: '08:00', endTime: '12:00' }  // Sex
      ],
      hourlyRateIndividual: 85,
      hourlyRateGroup: 130
    });

    // 2. Criar Salas
    const sala1 = await createRoomInFirebase(userId, {
      name: 'Sala 01',
      capacity: 30,
      resources: ['Projetor', 'Quadro Branco', 'Ar Condicionado']
    });

    const sala2 = await createRoomInFirebase(userId, {
      name: 'Sala 02',
      capacity: 20,
      resources: ['TV', 'Quadro Branco']
    });

    // 3. Criar Alunos
    const profileBase = {
      behavioralProfile: 'Estudioso, organizado, focado.',
      medicalRecords: [{ condition: 'Nenhuma', notes: '' }],
      schoolHistories: [{ schoolName: 'Colégio Estadual', year: '2023', notes: 'Bom aluno' }],
      currentSchool: 'Colégio Estadual',
      city: 'São Paulo',
      state: 'SP',
      schoolYear: '3º Ano E.M.',
      shift: 'Manhã',
      performanceEvaluation: 'Bom desempenho geral.',
      difficultSubjects: 'Física',
      easySubjects: 'Matemática, Biologia',
      hasDoneVestibular: 'Sim',
      targetCourse: 'Engenharia',
      targetUniversities: ['USP', 'UNICAMP'],
      routineObservations: 'Estuda à tarde, faz academia à noite.',
      studyMethodology: 'Pomodoro e mapas mentais.',
      materialsToUse: 'Apostilas do cursinho, simulados.',
      pedagogicalGoals: 'Aprovação no ENEM.',
      howToAct: 'Manter motivação e foco.',
      performances: [],
      recentTestScores: 'Nenhuma',
      tacticalPlans: []
    };

    const aluno1 = await createStudentInFirebase(userId, {
      name: 'Aluno 1',
      email: 'aluno1@teste.com',
      phone: '(11) 99999-1111',
      level: 'Ensino Médio',
      modality: 'Híbrido',
      currentSchool: 'Escola Modelo',
      city: 'São Paulo',
      state: 'SP',
      availability: [
        { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
        { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' }
      ],
      profile360: { ...profileBase }
    });

    const aluno2 = await createStudentInFirebase(userId, {
      name: 'Aluno 2',
      email: 'aluno2@teste.com',
      phone: '(11) 99999-2222',
      level: 'Ensino Médio',
      modality: 'Turma',
      currentSchool: 'Escola Padrão',
      city: 'São Paulo',
      state: 'SP',
      availability: [
        { dayOfWeek: 2, startTime: '14:00', endTime: '18:00' },
        { dayOfWeek: 4, startTime: '14:00', endTime: '18:00' }
      ],
      profile360: { ...profileBase, targetCourse: 'Medicina', difficultSubjects: 'Matemática, Química' }
    });

    const aluno3 = await createStudentInFirebase(userId, {
      name: 'Aluno 3',
      email: 'aluno3@teste.com',
      phone: '(11) 99999-3333',
      level: 'Ensino Médio',
      modality: 'Individual',
      currentSchool: 'Escola Exemplo',
      city: 'São Paulo',
      state: 'SP',
      availability: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 5, startTime: '08:00', endTime: '12:00' }
      ],
      profile360: { ...profileBase, targetCourse: 'Direito', difficultSubjects: 'Matemática' }
    });

    // 4. Criar Responsável
    await createGuardianInFirebase(userId, {
      name: 'Responsável Teste',
      email: 'responsavel@teste.com',
      phone: '(11) 98888-0000',
      cpf: '123.456.789-00',
      studentIds: [aluno1.id, aluno2.id, aluno3.id],
      relationship: 'Pai/Mãe',
      financialResponsible: true
    });

    // 5. Criar Turma
    await createClassGroupInFirebase(userId, {
      name: 'Turma ITA/IME',
      teacherIds: [profMat.id, profFis.id, profQui.id],
      studentIds: [aluno1.id, aluno2.id],
      workload: 20,
      subjects: ['Matemática', 'Física', 'Química'],
      schedules: [
        { dayOfWeek: 1, startTime: '14:00', endTime: '16:00', subject: 'Matemática', teacherId: profMat.id },
        { dayOfWeek: 2, startTime: '14:00', endTime: '16:00', subject: 'Física', teacherId: profFis.id },
        { dayOfWeek: 5, startTime: '14:00', endTime: '16:00', subject: 'Química', teacherId: profQui.id }
      ]
    });

    toast.success('Dados de teste criados com sucesso!', { id: 'seed' });
    
    // Forçar reload após criação
    setTimeout(() => {
      window.location.reload();
    }, 1500);

  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
    toast.error('Erro ao criar dados de teste.', { id: 'seed' });
  }
}
