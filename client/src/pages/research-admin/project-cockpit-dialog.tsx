import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock3, Play, RefreshCw } from 'lucide-react';

import type { ProjectCockpitDetail, ProjectTaskItem, ResearchProjectItem } from '@shared/api.interface';
import { STATUS_LABELS } from '@shared/status-labels';
import { approveProjectTask, createContinueJob, getProjectCockpit } from '../../api';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';

const statusIcon = (task: ProjectTaskItem): React.ReactNode => {
  if (task.status === 'done') return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (task.status === 'blocked') return <AlertTriangle className="size-4 text-rose-600" />;
  if (task.status === 'running') return <Play className="size-4 text-blue-600" />;
  if (task.status === 'waiting_approval') return <Clock3 className="size-4 text-amber-600" />;
  return <Circle className="size-4 text-slate-400" />;
};

export const ProjectCockpitDialog: React.FC<{
  project: ResearchProjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void>;
}> = ({ project, open, onOpenChange, onChanged }) => {
  const [detail, setDetail] = useState<ProjectCockpitDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async (): Promise<void> => {
    if (!project) return;
    setBusy(true); setMessage('');
    try { setDetail(await getProjectCockpit(project.id)); }
    catch (error: unknown) { setMessage(error instanceof Error ? error.message : '加载失败'); }
    finally { setBusy(false); }
  };

  useEffect(() => { if (open && project) void load(); }, [open, project?.id]);

  const stages = useMemo(() => {
    const groups = new Map<string, ProjectTaskItem[]>();
    detail?.tasks.forEach((task) => groups.set(task.stageName, [...(groups.get(task.stageName) ?? []), task]));
    return [...groups.entries()];
  }, [detail]);

  const approve = async (taskId: string): Promise<void> => {
    setBusy(true); setMessage('');
    try { setDetail(await approveProjectTask(taskId)); await onChanged(); setMessage('已人工确认，进度已由后端重新计算。'); }
    catch (error: unknown) { setMessage(error instanceof Error ? error.message : '确认失败'); }
    finally { setBusy(false); }
  };

  const continueRun = async (): Promise<void> => {
    if (!project) return;
    setBusy(true); setMessage('');
    try {
      await createContinueJob(project.id); await onChanged();
      setMessage(detail?.project.bridgeOnline ? '已加入执行队列。' : 'Bridge 当前离线，作业已安全保留为待执行。');
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : '创建作业失败'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project?.name ?? '项目驾驶舱'}</DialogTitle>
          <DialogDescription>任务进度、人工确认和 Codex 执行事件的统一视图。</DialogDescription>
        </DialogHeader>
        {busy && !detail ? <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-64" /></div> : null}
        {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
        {detail ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between"><span className="font-medium">总进度</span><span className="text-2xl font-semibold">{detail.project.progressPercent}%</span></div>
              <Progress className="mt-3" value={detail.project.progressPercent} />
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <Badge variant="outline">Codex：{STATUS_LABELS[detail.project.codexStatus] ?? detail.project.codexStatus}</Badge>
                <Badge variant="outline">Bridge：{detail.project.bridgeOnline ? '在线' : '离线'}</Badge>
                <Badge variant={detail.weightValid ? 'secondary' : 'destructive'}>权重 {detail.weightTotal}/100</Badge>
              </div>
              {detail.project.blocker ? <p className="mt-3 text-sm text-rose-700">阻塞：{detail.project.blocker}</p> : null}
              {detail.project.nextAction ? <p className="mt-2 text-sm text-slate-600">下一步：{detail.project.nextAction}</p> : null}
              <Button className="mt-4" onClick={() => void continueRun()} disabled={busy}>
                <Play className="size-4" />继续执行
              </Button>
            </section>
            <section className="space-y-4">
              {stages.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">该旧项目未自动回填任务，以避免误推研究进度。</p> : null}
              {stages.map(([stage, tasks]) => (
                <div key={stage}>
                  <h3 className="mb-2 font-semibold text-slate-900">{stage}</h3>
                  <div className="divide-y rounded-xl border border-slate-200">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                        <div className="flex min-w-0 gap-3">{statusIcon(task)}<div>
                          <p className="font-medium text-slate-900">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-500">权重 {task.weight}% · {STATUS_LABELS[task.status]}</p>
                          {task.deliverables.length ? <p className="mt-2 text-sm text-slate-600">交付物：{task.deliverables.join('、')}</p> : null}
                          {task.blocker ? <p className="mt-2 text-sm text-rose-700">阻塞：{task.blocker}</p> : null}
                        </div></div>
                        {task.status === 'waiting_approval' && task.requiresApproval ? (
                          <Button size="sm" onClick={() => void approve(task.id)} disabled={busy}>确认通过</Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            <section>
              <h3 className="mb-3 font-semibold text-slate-900">最近事件</h3>
              <div className="space-y-2">
                {detail.timeline.length === 0 ? <p className="text-sm text-slate-500">暂无 Codex 事件。</p> : detail.timeline.map((event) => (
                  <div key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="font-medium">{STATUS_LABELS[event.eventType] ?? event.eventType}</span><span className="text-xs text-slate-400">{new Date(event.occurredAt).toLocaleString('zh-CN')}</span></div>
                    <p className="mt-1 text-slate-600">{event.summary}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
        {detail && busy ? <div className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="size-4 animate-spin" />正在同步…</div> : null}
      </DialogContent>
    </Dialog>
  );
};
