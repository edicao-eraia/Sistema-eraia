import type { ClassGroupPlan, DidacticSequence } from '../types';

function sequenceKey({ front, content }: DidacticSequence) {
  return `${(front ?? '').trim().toLocaleLowerCase('pt-BR')}::${content.trim().toLocaleLowerCase('pt-BR')}`;
}

export function mergeImportedSequences(
  existing: DidacticSequence[],
  imported: DidacticSequence[],
): DidacticSequence[] {
  const keys = new Set<string>();

  return [...existing, ...imported].reduce<DidacticSequence[]>((sequences, sequence) => {
    const key = sequenceKey(sequence);
    if (keys.has(key)) return sequences;

    keys.add(key);
    sequences.push({ ...sequence, order: sequences.length + 1 });
    return sequences;
  }, []);
}

export function normalizePlansForSubjects(plans: ClassGroupPlan[], subjects: string[]) {
  const subjectSet = new Set(subjects);
  const active: ClassGroupPlan[] = [];
  const orphaned: ClassGroupPlan[] = [];

  for (const plan of plans) {
    (subjectSet.has(plan.subject) ? active : orphaned).push(plan);
  }

  return { active, orphaned };
}
