import { BUILTIN_TASKS as BASIS } from './library';
import { TASKS_BINNEN } from './library-binnen';
import { TASKS_NATUUR } from './library-natuur';
import { TASKS_OVERAL } from './library-overal';
import { TASKS_TUIN } from './library-tuin';
import type { TaskDef } from './types';

/** Alle ingebouwde opdrachten: de basisset plus de uitbreidingen per plek. */
export const ALL_BUILTIN: TaskDef[] = [...BASIS, ...TASKS_BINNEN, ...TASKS_TUIN, ...TASKS_NATUUR, ...TASKS_OVERAL];

/** Eigen en AI-opdrachten komen hier bij. */
let extraTasks: TaskDef[] = [];

export function setExtraTasks(tasks: TaskDef[]): void {
  extraTasks = tasks;
}

export function allTasks(): TaskDef[] {
  return [...ALL_BUILTIN, ...extraTasks];
}

export function getTask(id: string): TaskDef | undefined {
  return ALL_BUILTIN.find((t) => t.id === id) ?? extraTasks.find((t) => t.id === id);
}