import type { Application, RequestHandler } from 'express';
import { z } from 'zod';

export interface ClassGroupRouteState {
  classGroups: any[];
  bookings: any[];
}

interface RegisterClassGroupRoutesOptions {
  authenticate: RequestHandler;
  requireAdmin: RequestHandler;
  getState: () => ClassGroupRouteState;
  setState: (state: ClassGroupRouteState) => void;
  persist: (state: ClassGroupRouteState) => Promise<void>;
  acquireMutex: () => Promise<void>;
  releaseMutex: () => void;
  createId?: () => string;
  onPersistenceError?: (error: unknown) => void;
}

const nonEmptyString = z.string().trim().min(1);
const idList = z.array(z.string()).transform(values => (
  [...new Set(values.map(value => value.trim()).filter(Boolean))]
));

const subjectList = idList;

const rawSequenceSchema = z.object({
  front: z.string().trim().optional(),
  content: z.string().trim(),
  order: z.number().finite().optional(),
});

const sequencesSchema = z.array(rawSequenceSchema).transform(sequences => (
  sequences
    .filter(sequence => sequence.content.length > 0)
    .map((sequence, index) => ({
      ...(sequence.front !== undefined ? { front: sequence.front } : {}),
      content: sequence.content,
      order: index + 1,
    }))
));

const planSchema = z.object({
  subject: nonEmptyString,
  weeklyHours: z.number().finite().nonnegative().default(0),
  strategy: z.string().trim().default(''),
  sequences: sequencesSchema.default([]),
});

const plansSchema = z.array(planSchema).superRefine((plans, context) => {
  const subjects = new Set<string>();
  plans.forEach((plan, index) => {
    if (subjects.has(plan.subject)) {
      context.addIssue({
        code: 'custom',
        message: 'Cada disciplina pode ter apenas um planejamento.',
        path: [index, 'subject'],
      });
    }
    subjects.add(plan.subject);
  });
});

const scheduleSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  subject: z.string(),
  teacherId: z.string(),
  roomId: z.string().optional(),
});

const classGroupFields = {
  name: nonEmptyString,
  workload: z.number().finite().positive(),
  teacherIds: idList,
  studentIds: idList,
  subjects: subjectList,
  schedules: z.array(scheduleSchema),
  plans: plansSchema.optional(),
};

const createClassGroupSchema = z.object({
  ...classGroupFields,
  teacherIds: classGroupFields.teacherIds.default([]),
  studentIds: classGroupFields.studentIds.default([]),
  subjects: classGroupFields.subjects.default([]),
  schedules: classGroupFields.schedules.default([]),
});

const updateClassGroupSchema = z.object(classGroupFields).partial();

type ParsedClassGroup = z.infer<typeof createClassGroupSchema>;
type ParseResult =
  | { success: true; data: ParsedClassGroup }
  | { success: false; message: string };

function validatePlanSubjects(group: ParsedClassGroup) {
  const subjects = new Set(group.subjects);
  const orphaned = (group.plans ?? []).find(plan => !subjects.has(plan.subject));
  return orphaned
    ? `O planejamento de ${orphaned.subject} não pertence às disciplinas da turma.`
    : null;
}

function parseCreate(body: unknown): ParseResult {
  const result = createClassGroupSchema.safeParse(body);
  if (!result.success) {
    return { success: false, message: result.error.issues[0]?.message || 'Payload de turma inválido.' };
  }
  const planError = validatePlanSubjects(result.data);
  if (planError) return { success: false, message: planError };
  return { success: true, data: result.data };
}

function parseUpdate(body: unknown, current: unknown): ParseResult {
  const patch = updateClassGroupSchema.safeParse(body);
  if (!patch.success) {
    return { success: false, message: patch.error.issues[0]?.message || 'Payload de turma inválido.' };
  }
  return parseCreate({ ...(current as object), ...patch.data });
}

function syncClassGroupBookings(group: any, currentBookings: any[], now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const bookings = currentBookings.filter(booking => {
    if (booking.classGroupId !== group.id) return true;
    if (booking.status !== 'agendada') return true;
    return new Date(booking.date) < today;
  });

  if (!group.schedules?.length) return bookings;

  const end = new Date(today);
  end.setMonth(end.getMonth() + 3);
  const current = new Date(today);
  while (current <= end) {
    const schedules = group.schedules.filter((schedule: any) => schedule.dayOfWeek === current.getDay());
    for (const schedule of schedules) {
      if (!schedule.teacherId) continue;
      const date = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const exists = bookings.some(booking => (
        booking.classGroupId === group.id
        && booking.date === date
        && booking.startTime === schedule.startTime
        && booking.status !== 'agendada'
      ));
      if (exists) continue;
      bookings.push({
        id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        classGroupId: group.id,
        studentIds: group.studentIds,
        teacherId: schedule.teacherId,
        roomId: schedule.roomId || '',
        date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        subject: schedule.subject,
        status: 'agendada',
        createdAt: new Date().toISOString(),
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return bookings;
}

export function registerClassGroupRoutes(app: Application, options: RegisterClassGroupRoutesOptions) {
  const markPersistenceHandled: RequestHandler = (_req, res, next) => {
    res.locals.persistenceHandled = true;
    next();
  };
  const writeMiddleware = [options.authenticate, options.requireAdmin, markPersistenceHandled];
  const createId = options.createId ?? (() => `class-${Date.now()}`);
  const reportPersistenceError = options.onPersistenceError ?? (() => undefined);

  app.get('/api/class-groups', options.authenticate, (_req, res) => {
    res.json({ classGroups: options.getState().classGroups });
  });

  app.post('/api/class-groups', ...writeMiddleware, async (req, res) => {
    const parsed = parseCreate(req.body);
    if (parsed.success === false) return res.status(400).json({ error: parsed.message });

    await options.acquireMutex();
    try {
      const current = options.getState();
      const group = { ...parsed.data, id: createId() };
      const next = {
        classGroups: [...current.classGroups, group],
        bookings: syncClassGroupBookings(group, current.bookings),
      };
      await options.persist(next);
      options.setState(next);
      return res.status(201).json({ message: 'Turma cadastrada com sucesso', classGroup: group });
    } catch (error) {
      reportPersistenceError(error);
      return res.status(500).json({ error: 'Não foi possível persistir a turma.' });
    } finally {
      options.releaseMutex();
    }
  });

  app.put('/api/class-groups/:id', ...writeMiddleware, async (req, res) => {
    await options.acquireMutex();
    try {
      const current = options.getState();
      const index = current.classGroups.findIndex(group => group.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Turma não encontrada' });
      const parsed = parseUpdate(req.body, current.classGroups[index]);
      if (parsed.success === false) return res.status(400).json({ error: parsed.message });

      const group = { ...parsed.data, id: req.params.id };
      const classGroups = current.classGroups.map((candidate, groupIndex) => (
        groupIndex === index ? group : candidate
      ));
      const next = {
        classGroups,
        bookings: syncClassGroupBookings(group, current.bookings),
      };
      await options.persist(next);
      options.setState(next);
      return res.json({ message: 'Turma atualizada', classGroup: group });
    } catch (error) {
      reportPersistenceError(error);
      return res.status(500).json({ error: 'Não foi possível persistir a turma.' });
    } finally {
      options.releaseMutex();
    }
  });

  app.delete('/api/class-groups/:id', ...writeMiddleware, async (req, res) => {
    await options.acquireMutex();
    try {
      const current = options.getState();
      const index = current.classGroups.findIndex(group => group.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Turma não encontrada' });
      const group = current.classGroups[index];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = {
        classGroups: current.classGroups.filter((_, groupIndex) => groupIndex !== index),
        bookings: current.bookings.filter(booking => (
          booking.classGroupId !== group.id
          || booking.status !== 'agendada'
          || new Date(booking.date) < today
        )),
      };
      await options.persist(next);
      options.setState(next);
      return res.json({ message: 'Turma deletada' });
    } catch (error) {
      reportPersistenceError(error);
      return res.status(500).json({ error: 'Não foi possível persistir a turma.' });
    } finally {
      options.releaseMutex();
    }
  });
}
