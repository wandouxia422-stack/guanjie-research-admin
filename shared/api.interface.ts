export type ProjectTaskStatus = 'todo' | 'running' | 'waiting_approval' | 'blocked' | 'done';
export type CodexEventType = 'run_started' | 'task_started' | 'task_completed' | 'waiting_approval' | 'blocked' | 'run_paused' | 'run_failed' | 'run_completed';
export type CodexJobStatus = 'pending' | 'claimed' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ResearchProjectItem {
  id: string; projectCode: string; name: string; clientName: string | null; category: string;
  stageSnapshot: string; projectStatus: string; statusNote: string | null; researchLocked: boolean;
  archived: boolean; sortOrder: number; progressPercent: number; codexStatus: string;
  currentStage: string | null; currentTask: string | null; nextAction: string | null;
  blocker: string | null; codexThreadId: string | null; repoFullName: string | null;
  repoLocalPath: string | null; lastSyncedAt: string | null; pendingApprovals: number;
  bridgeOnline: boolean; updatedAt: string;
}

export interface ResourceEntryItem {
  id: string; resourceCode: string; projectId: string | null; title: string; resourceType: string;
  appId: string | null; publicUrl: string; adminUrl: string | null; lifecycle: string;
  verified: boolean; verificationNote: string | null; sortOrder: number; updatedAt: string;
}

export interface ProjectTaskItem {
  id: string; projectId: string; taskCode: string; stageCode: string; stageName: string;
  title: string; description: string | null; weight: number; status: ProjectTaskStatus;
  requiresApproval: boolean; deliverables: string[]; completionSummary: string | null;
  blocker: string | null; sortOrder: number; startedAt: string | null; completedAt: string | null;
}

export interface CodexEventItem {
  id: string; eventId: string; projectCode: string; threadId: string | null;
  taskCode: string | null; eventType: CodexEventType; summary: string; occurredAt: string;
}

export interface ProjectCockpitDetail {
  project: ResearchProjectItem; tasks: ProjectTaskItem[]; timeline: CodexEventItem[];
  weightTotal: number; weightValid: boolean;
}

export interface ProjectTaskTemplateItem {
  id: string; taskCode: string; stageCode: string; stageName: string; title: string;
  description: string | null; weight: number; requiresApproval: boolean; sortOrder: number;
}

export interface ProjectTaskTemplate {
  id: string; templateCode: string; name: string; category: string;
  description: string | null; enabled: boolean; items: ProjectTaskTemplateItem[];
}

export interface UpdateProjectTaskTemplateItemRequest {
  stageName?: string; title?: string; description?: string; weight?: number;
  requiresApproval?: boolean; sortOrder?: number;
}

export interface ResearchAdminOverview {
  projects: ResearchProjectItem[]; activeResources: ResourceEntryItem[]; excludedResources: ResourceEntryItem[];
  stats: { activeProjects: number; activeResources: number; verifiedResources: number; excludedResources: number };
}

export interface CreateResearchProjectRequest {
  name: string; clientName?: string; category: string; stageSnapshot: string; statusNote?: string;
  templateCode?: string; repoFullName?: string; repoLocalPath?: string;
}

export interface CreateResourceEntryRequest {
  projectId?: string; title: string; resourceType: string; appId?: string;
  publicUrl: string; adminUrl?: string; verificationNote?: string;
}

export interface UpdateProjectTaskRequest {
  status: ProjectTaskStatus; summary?: string; deliverables?: string[];
  blocker?: string | null; nextAction?: string | null;
}

export interface CodexEventRequest {
  eventId: string; projectCode: string; threadId: string; taskCode?: string;
  eventType: CodexEventType; summary: string; deliverables: string[];
  blocker: string | null; nextAction: string | null; occurredAt: string;
}

export interface CodexJobItem {
  id: string; projectId: string; projectCode: string; action: string; status: CodexJobStatus;
  payload: Record<string, unknown>; bridgeId: string | null; threadId: string | null;
  repoLocalPath: string | null; createdAt: string;
}

export interface BridgeHeartbeatRequest { bridgeId: string; projectRoot?: string; }
export interface CompleteCodexJobRequest {
  status: 'completed' | 'failed'; threadId?: string; summary?: string; errorMessage?: string;
}
