import type { AvailabilitySlot } from '../types';

export const SHIFT_DEFINITIONS = {
  morning: { label: 'Manhã', start: '08:00', end: '13:00' },
  afternoon: { label: 'Tarde', start: '14:00', end: '18:00' },
  night: { label: 'Noite', start: '18:00', end: '21:00' },
} as const;

export type AvailabilityShiftKey = keyof typeof SHIFT_DEFINITIONS;

export function createWeekdaySlots(key: AvailabilityShiftKey) {
  const shift = SHIFT_DEFINITIONS[key];
  return [1, 2, 3, 4, 5].map(dayOfWeek => ({
    dayOfWeek,
    startTime: shift.start,
    endTime: shift.end,
  }));
}

export function migrateAfternoonAvailability<T extends { availability?: AvailabilitySlot[] }>(records: T[]) {
  let changed = false;
  const migrated = records.map(record => {
    let recordChanged = false;
    const availability = record.availability?.map(slot => {
      if (slot.startTime === '13:00' && slot.endTime === '18:00') {
        changed = recordChanged = true;
        return { ...slot, startTime: '14:00' };
      }
      return slot;
    });

    return recordChanged ? { ...record, availability } : record;
  });

  return { records: changed ? migrated : records, changed };
}

export async function migrateAndPersistAvailability<
  Student extends { availability?: AvailabilitySlot[] },
  Teacher extends { availability?: AvailabilitySlot[] },
  State extends { students: Student[]; teachers: Teacher[] },
>(state: State, persist: (state: State) => Promise<void>) {
  const studentMigration = migrateAfternoonAvailability(state.students);
  const teacherMigration = migrateAfternoonAvailability(state.teachers);
  const changed = studentMigration.changed || teacherMigration.changed;
  const migratedState: State = changed
    ? { ...state, students: studentMigration.records, teachers: teacherMigration.records }
    : state;

  if (changed) {
    await persist(migratedState);
  }

  return { state: migratedState, changed };
}
