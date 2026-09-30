import { BUILTIN_TASKS } from './library';
import type { TaskDef } from './types';

/**
 * Alle opdrachten die de app kent. Eigen en AI-opdrachten (stap 5) komen hier later bij.
 */
let extraTasks: TaskDef[] = [];

export function setExtraTasks(tasks: TaskDef[]): void {
  extraTasks = tasks;
}

export function allTasks(): TaskDef[] {
  return [...BUILTIN_TASKS, ...extraTasks];
}

export function getTask(id: string): TaskDef | undefined {
  return BUILTIN_TASKS.find((t) => t.id === id) ?? extraTasks.find((t) => t.id === id);
}
