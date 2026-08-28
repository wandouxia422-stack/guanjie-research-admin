export interface ResearchProjectItem {
  id: string;
  projectCode: string;
  name: string;
  clientName: string | null;
  category: string;
  stageSnapshot: string;
  projectStatus: string;
  statusNote: string | null;
  researchLocked: boolean;
  archived: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface ResourceEntryItem {
  id: string;
  resourceCode: string;
  projectId: string | null;
  title: string;
  resourceType: string;
  appId: string | null;
  publicUrl: string;
  adminUrl: string | null;
  lifecycle: string;
  verified: boolean;
  verificationNote: string | null;
  sortOrder: number;
  updatedAt: string;
}

export interface ResearchAdminOverview {
  projects: ResearchProjectItem[];
  activeResources: ResourceEntryItem[];
  excludedResources: ResourceEntryItem[];
  stats: {
    activeProjects: number;
    activeResources: number;
    verifiedResources: number;
    excludedResources: number;
  };
}

export interface CreateResearchProjectRequest {
  name: string;
  clientName?: string;
  category: string;
  stageSnapshot: string;
  statusNote?: string;
}

export interface CreateResourceEntryRequest {
  projectId?: string;
  title: string;
  resourceType: string;
  appId?: string;
  publicUrl: string;
  adminUrl?: string;
  verificationNote?: string;
}
