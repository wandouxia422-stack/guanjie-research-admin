import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateResearchProjectRequest,
  CreateResourceEntryRequest,
  CodexJobItem,
  ProjectCockpitDetail,
  ResearchAdminOverview,
  ResearchProjectItem,
  ResourceEntryItem,
} from '@shared/api.interface';


const normalizeError = (error: unknown, message: string): Error => {
  logger.error(message, error);
  if (error instanceof Error) return error;
  return new Error(message);
};

export const getResearchAdminOverview = async (): Promise<ResearchAdminOverview> => {
  try {
    const response = await axiosForBackend({
      url: '/api/research-admin/overview',
      method: 'GET',
    });
    if (response.status === 403) throw new Error('无权查看调研总后台');
    return response.data as ResearchAdminOverview;
  } catch (error: unknown) {
    throw normalizeError(error, '加载调研总后台失败');
  }
};

export const createResearchProject = async (
  payload: CreateResearchProjectRequest,
): Promise<ResearchProjectItem> => {
  try {
    const response = await axiosForBackend({
      url: '/api/research-admin/projects',
      method: 'POST',
      data: payload,
    });
    if (response.status === 403) throw new Error('无权新增项目');
    return response.data as ResearchProjectItem;
  } catch (error: unknown) {
    throw normalizeError(error, '新增项目失败');
  }
};

export const createResourceEntry = async (
  payload: CreateResourceEntryRequest,
): Promise<ResourceEntryItem> => {
  try {
    const response = await axiosForBackend({
      url: '/api/research-admin/resources',
      method: 'POST',
      data: payload,
    });
    if (response.status === 403) throw new Error('无权新增资源入口');
    return response.data as ResourceEntryItem;
  } catch (error: unknown) {
    throw normalizeError(error, '新增资源入口失败');
  }
};

export const getProjectCockpit = async (projectId: string): Promise<ProjectCockpitDetail> => {
  try {
    const response = await axiosForBackend({
      url: `/api/research-admin/projects/${projectId}/cockpit`, method: 'GET',
    });
    return response.data as ProjectCockpitDetail;
  } catch (error: unknown) {
    throw normalizeError(error, '加载项目驾驶舱失败');
  }
};

export const approveProjectTask = async (
  taskId: string,
): Promise<ProjectCockpitDetail> => {
  try {
    const response = await axiosForBackend({
      url: `/api/research-admin/tasks/${taskId}/approve`, method: 'POST',
    });
    return response.data as ProjectCockpitDetail;
  } catch (error: unknown) {
    throw normalizeError(error, '确认任务失败');
  }
};

export const createContinueJob = async (projectId: string): Promise<CodexJobItem> => {
  try {
    const response = await axiosForBackend({
      url: `/api/research-admin/projects/${projectId}/jobs/continue`, method: 'POST',
    });
    return response.data as CodexJobItem;
  } catch (error: unknown) {
    throw normalizeError(error, '创建继续执行作业失败');
  }
};
