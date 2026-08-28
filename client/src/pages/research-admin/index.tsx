import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  CirclePlus,
  Database,
  FileText,
  Link2,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';

import type {
  CreateResearchProjectRequest,
  CreateResourceEntryRequest,
  ResearchAdminOverview,
  ResearchProjectItem,
  ResourceEntryItem,
} from '@shared/api.interface';

import {
  createResearchProject,
  createResourceEntry,
  getResearchAdminOverview,
} from '../../api';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';

interface ProjectFormState {
  name: string;
  clientName: string;
  category: string;
  stageSnapshot: string;
  statusNote: string;
}

interface ResourceFormState {
  projectId: string;
  title: string;
  resourceType: string;
  appId: string;
  publicUrl: string;
  adminUrl: string;
  verificationNote: string;
}

const PROJECT_INITIAL: ProjectFormState = {
  name: '',
  clientName: '',
  category: '品牌全案',
  stageSnapshot: '待确认',
  statusNote: '仅作管理快照，不自动推进研究状态。',
};

const RESOURCE_INITIAL: ResourceFormState = {
  projectId: 'shared',
  title: '',
  resourceType: 'online_page',
  appId: '',
  publicUrl: '',
  adminUrl: '',
  verificationNote: '',
};

const RESOURCE_LABELS: Record<string, string> = {
  enterprise_questionnaire: '企业问卷',
  consumer_interview: '消费者访谈',
  shared_tool: '通用工具',
  online_page: '线上页面',
  legacy_page: '旧版备份',
};

const ResourceIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'enterprise_questionnaire') return <FileText className="size-5" />;
  if (type === 'consumer_interview') return <MessageSquareText className="size-5" />;
  if (type === 'shared_tool') return <Wrench className="size-5" />;
  return <Link2 className="size-5" />;
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  detail: string;
}> = ({ label, value, icon, detail }) => (
  <Card className="border-slate-200/80 shadow-none">
    <CardContent className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</span>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </CardContent>
  </Card>
);

const ResourceCard: React.FC<{
  resource: ResourceEntryItem;
  projectName?: string;
}> = ({ resource, projectName }) => (
  <Card className="group border-slate-200/80 shadow-none transition-colors hover:border-slate-300">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-slate-900 p-2.5 text-white">
            <ResourceIcon type={resource.resourceType} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-950">{resource.title}</h3>
              {resource.verified ? (
                <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  已核验
                </Badge>
              ) : (
                <Badge variant="outline">待核验</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {projectName || '观界通用工具'} · {RESOURCE_LABELS[resource.resourceType] || resource.resourceType}
            </p>
            {resource.appId && (
              <p className="mt-2 font-mono text-xs text-slate-400">{resource.appId}</p>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
        {resource.verificationNote || '暂无核验说明'}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={resource.publicUrl} target="_blank" rel="noreferrer">
            打开前台
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
        {resource.adminUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={resource.adminUrl} target="_blank" rel="noreferrer">
              进入后台
              <LockKeyhole className="size-4" />
            </a>
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

const ResearchAdminPage: React.FC = () => {
  const userInfo = useCurrentUserProfile();
  const [overview, setOverview] = useState<ResearchAdminOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [projectDialogOpen, setProjectDialogOpen] = useState<boolean>(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState<boolean>(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(PROJECT_INITIAL);
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(RESOURCE_INITIAL);

  const projectNames: Map<string, string> = useMemo(() => {
    const map: Map<string, string> = new Map<string, string>();
    overview?.projects.forEach((project: ResearchProjectItem) => {
      map.set(project.id, project.name);
    });
    return map;
  }, [overview]);

  const loadOverview = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data: ResearchAdminOverview = await getResearchAdminOverview();
      setOverview(data);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleCreateProject = async (): Promise<void> => {
    if (!projectForm.name.trim() || !projectForm.stageSnapshot.trim()) {
      setError('请填写项目名称和当前阶段快照');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: CreateResearchProjectRequest = {
        name: projectForm.name,
        clientName: projectForm.clientName || undefined,
        category: projectForm.category,
        stageSnapshot: projectForm.stageSnapshot,
        statusNote: projectForm.statusNote || undefined,
      };
      await createResearchProject(payload);
      setProjectDialogOpen(false);
      setProjectForm(PROJECT_INITIAL);
      await loadOverview();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : '新增项目失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateResource = async (): Promise<void> => {
    if (!resourceForm.title.trim() || !resourceForm.publicUrl.trim()) {
      setError('请填写入口名称和前台链接');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: CreateResourceEntryRequest = {
        projectId: resourceForm.projectId === 'shared' ? undefined : resourceForm.projectId,
        title: resourceForm.title,
        resourceType: resourceForm.resourceType,
        appId: resourceForm.appId || undefined,
        publicUrl: resourceForm.publicUrl,
        adminUrl: resourceForm.adminUrl || undefined,
        verificationNote: resourceForm.verificationNote || undefined,
      };
      await createResourceEntry(payload);
      setResourceDialogOpen(false);
      setResourceForm(RESOURCE_INITIAL);
      await loadOverview();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : '新增入口失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !overview) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-10 lg:px-8">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item: number) => (
            <Skeleton key={item} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-950 p-2.5 text-white">
                <Database className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-950">观界调研总后台</h1>
                <p className="text-sm text-slate-500">真实项目、问卷、访谈与线上入口统一管理</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void loadOverview()} disabled={loading}>
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
              刷新
            </Button>
            <Button variant="outline" onClick={() => setResourceDialogOpen(true)}>
              <Link2 className="size-4" />
              新增入口
            </Button>
            <Button onClick={() => setProjectDialogOpen(true)}>
              <CirclePlus className="size-4" />
              新增项目
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8 lg:px-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {userInfo?.user_id ? `${userInfo.name || '管理员'}，欢迎回来` : '正在确认登录身份'}
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">调研资产全景</h2>
          </div>
          <Badge variant="outline" className="gap-1.5 bg-white px-3 py-1.5 text-slate-600">
            <ShieldCheck className="size-4 text-emerald-600" />
            仅管理汇总，不自动推进研究
          </Badge>
        </section>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>操作未完成</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {overview && (
          <>
            <section data-ai-section-type="card-stat" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="真实项目" value={overview.stats.activeProjects} icon={<BriefcaseBusiness className="size-5" />} detail="已核验并纳入管理" />
              <StatCard label="正式入口" value={overview.stats.activeResources} icon={<Link2 className="size-5" />} detail="前台与后台统一汇总" />
              <StatCard label="已核验资产" value={overview.stats.verifiedResources} icon={<ShieldCheck className="size-5" />} detail="已核验应用、数据库与角色" />
              <StatCard label="排除项" value={overview.stats.excludedResources} icon={<Archive className="size-5" />} detail="旧链接仅存档，不混入正式入口" />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-950">项目进度快照</h2>
                <p className="mt-1 text-sm text-slate-500">状态仅来自已核验资料，不读取问卷数量推测进度。</p>
              </div>
              <div data-ai-section-type="card-list" className="grid gap-4 lg:grid-cols-2">
                {overview.projects.map((project: ResearchProjectItem) => (
                  <Card key={project.id} className="border-slate-200/80 shadow-none">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription className="mt-1">{project.clientName || '未填写客户名'} · {project.category}</CardDescription>
                        </div>
                        <Badge className="bg-slate-950 text-white">进行中</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-amber-700">当前阶段快照</p>
                        <p className="mt-1 font-medium text-amber-950">{project.stageSnapshot}</p>
                      </div>
                      <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600">
                        <LockKeyhole className="mt-1 size-4 shrink-0 text-slate-400" />
                        <span>{project.statusNote || '本后台不推进研究状态。'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-950">全部正式入口</h2>
                <p className="mt-1 text-sm text-slate-500">问卷、访谈、后台和通用工具从这里统一进入。</p>
              </div>
              <div data-ai-section-type="card-list" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {overview.activeResources.map((resource: ResourceEntryItem) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    projectName={resource.projectId ? projectNames.get(resource.projectId) : undefined}
                  />
                ))}
              </div>
            </section>

            <section>
              <Card className="border-dashed border-slate-300 bg-slate-50 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Archive className="size-4" />
                    已排除与旧版备份
                  </CardTitle>
                  <CardDescription>这些记录仅用于防止误用，不会出现在正式入口区。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {overview.excludedResources.map((resource: ResourceEntryItem) => (
                    <div key={resource.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-700">{resource.title}</p>
                        <Badge variant="outline">已排除</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{resource.verificationNote}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增真实项目</DialogTitle>
            <DialogDescription>只建立管理档案，不会启动或推进品牌研究。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="project-name">项目名称</Label><Input id="project-name" value={projectForm.name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setProjectForm({ ...projectForm, name: event.target.value })} placeholder="例：某品牌全案" /></div>
            <div className="grid gap-2"><Label htmlFor="client-name">客户名称</Label><Input id="client-name" value={projectForm.clientName} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setProjectForm({ ...projectForm, clientName: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="project-category">项目类型</Label><Input id="project-category" value={projectForm.category} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setProjectForm({ ...projectForm, category: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="stage-snapshot">当前阶段快照</Label><Input id="stage-snapshot" value={projectForm.stageSnapshot} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setProjectForm({ ...projectForm, stageSnapshot: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="status-note">状态说明</Label><Textarea id="status-note" value={projectForm.statusNote} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setProjectForm({ ...projectForm, statusNote: event.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => void handleCreateProject()} disabled={saving}>{saving ? '正在保存…' : '保存项目'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增线上入口</DialogTitle>
            <DialogDescription>新入口默认标记为“待核验”，不会自动冒充正式资产。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>关联项目</Label><Select value={resourceForm.projectId} onValueChange={(value: string) => setResourceForm({ ...resourceForm, projectId: value })}><SelectTrigger className="w-full"><SelectValue placeholder="选择项目" /></SelectTrigger><SelectContent><SelectItem value="shared">观界通用工具</SelectItem>{overview?.projects.map((project: ResearchProjectItem) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="resource-title">入口名称</Label><Input id="resource-title" value={resourceForm.title} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setResourceForm({ ...resourceForm, title: event.target.value })} /></div>
            <div className="grid gap-2"><Label>入口类型</Label><Select value={resourceForm.resourceType} onValueChange={(value: string) => setResourceForm({ ...resourceForm, resourceType: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="enterprise_questionnaire">企业问卷</SelectItem><SelectItem value="consumer_interview">消费者访谈</SelectItem><SelectItem value="shared_tool">通用工具</SelectItem><SelectItem value="online_page">线上页面</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="resource-app-id">妙搭 App ID（可选）</Label><Input id="resource-app-id" value={resourceForm.appId} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setResourceForm({ ...resourceForm, appId: event.target.value })} placeholder="app_xxx" /></div>
            <div className="grid gap-2"><Label htmlFor="public-url">前台链接</Label><Input id="public-url" value={resourceForm.publicUrl} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setResourceForm({ ...resourceForm, publicUrl: event.target.value })} placeholder="https://" /></div>
            <div className="grid gap-2"><Label htmlFor="admin-url">后台链接（可选）</Label><Input id="admin-url" value={resourceForm.adminUrl} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setResourceForm({ ...resourceForm, adminUrl: event.target.value })} placeholder="https://" /></div>
            <div className="grid gap-2"><Label htmlFor="verification-note">核验说明</Label><Textarea id="verification-note" value={resourceForm.verificationNote} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setResourceForm({ ...resourceForm, verificationNote: event.target.value })} placeholder="记录来源、校验日期或待核对事项" /></div>
          </div>
          <DialogFooter><Button onClick={() => void handleCreateResource()} disabled={saving}>{saving ? '正在保存…' : '保存入口'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResearchAdminPage;
