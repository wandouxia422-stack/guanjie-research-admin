import type { ProjectTaskStatus } from '@shared/api.interface';

export interface WeightedTask { weight: number; status: ProjectTaskStatus }

export const calculateProgressPercent = (tasks: WeightedTask[]): number => {
  const total = tasks.reduce((sum, task) => sum + task.weight, 0);
  if (total <= 0) return 0;
  const completed = tasks.reduce(
    (sum, task) => sum + (task.status === 'done' ? task.weight : 0),
    0,
  );
  return Math.round((completed / total) * 100);
};

export const isWeightTotalValid = (tasks: WeightedTask[]): boolean =>
  tasks.length > 0 && tasks.reduce((sum, task) => sum + task.weight, 0) === 100;

export const isBridgeOnline = (lastHeartbeatAt: Date | null, now = new Date()): boolean =>
  Boolean(lastHeartbeatAt && now.getTime() - lastHeartbeatAt.getTime() <= 90_000);

export const isDuplicateEventId = (existingIds: string[], eventId: string | undefined): boolean =>
  Boolean(eventId && existingIds.includes(eventId));

export const canClaimJob = (status: string): boolean => status === 'pending';
