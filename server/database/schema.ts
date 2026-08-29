/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, integer, jsonb, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const codexBridge = pgTable("codex_bridge", {
  id: uuid("id").primaryKey().defaultRandom(),
  bridgeId: varchar("bridge_id", { length: 200 }).notNull().unique(),
  status: varchar("status", { length: 30 }).notNull().default('online'),
  projectRoot: text("project_root"),
  lastHeartbeatAt: customTimestamptz("last_heartbeat_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("codex_bridge_bridge_id_key").on(table.bridgeId),
]);

export const codexJob = pgTable("codex_job", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default('pending'),
  /**
   * @type Record<string, unknown>
   */
  payload: jsonb("payload").notNull().default('{}'),
  bridgeId: varchar("bridge_id", { length: 200 }),
  claimedAt: customTimestamptz("claimed_at", { precision: 3 }),
  completedAt: customTimestamptz("completed_at", { precision: 3 }),
  errorMessage: text("error_message"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_codex_job_pending").on(table.status, table.createdAt),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [researchProject.id],
    name: "codex_job_project_id_fkey",
  }),
]);

export const codexEvent = pgTable("codex_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 200 }).notNull().unique(),
  projectId: uuid("project_id").notNull(),
  projectCode: varchar("project_code", { length: 100 }).notNull(),
  threadId: varchar("thread_id", { length: 200 }),
  taskCode: varchar("task_code", { length: 100 }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  summary: text("summary").notNull(),
  /**
   * @type Record<string, unknown>
   */
  payload: jsonb("payload").notNull().default('{}'),
  occurredAt: customTimestamptz("occurred_at", { precision: 3 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("codex_event_event_id_key").on(table.eventId),
  index("idx_codex_event_project").on(table.projectId, table.occurredAt),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [researchProject.id],
    name: "codex_event_project_id_fkey",
  }),
]);

export const projectTask = pgTable("project_task", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  taskCode: varchar("task_code", { length: 100 }).notNull(),
  stageCode: varchar("stage_code", { length: 100 }).notNull(),
  stageName: varchar("stage_name", { length: 200 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  weight: integer("weight").notNull(),
  status: varchar("status", { length: 40 }).notNull().default('todo'),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  /**
   * @type string[]
   */
  deliverables: jsonb("deliverables").notNull().default('[]'),
  completionSummary: text("completion_summary"),
  blocker: text("blocker"),
  sortOrder: integer("sort_order").notNull().default(0),
  startedAt: customTimestamptz("started_at", { precision: 3 }),
  completedAt: customTimestamptz("completed_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("project_task_project_id_task_code_key").on(table.projectId, table.taskCode),
  index("idx_project_task_project").on(table.projectId, table.sortOrder),
  index("idx_project_task_status").on(table.projectId, table.status),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [researchProject.id],
    name: "project_task_project_id_fkey",
  }),
]);

export const projectTaskTemplateItem = pgTable("project_task_template_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").notNull(),
  taskCode: varchar("task_code", { length: 100 }).notNull(),
  stageCode: varchar("stage_code", { length: 100 }).notNull(),
  stageName: varchar("stage_name", { length: 200 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  weight: integer("weight").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("project_task_template_item_template_id_task_code_key").on(table.templateId, table.taskCode),
  index("idx_template_item_order").on(table.templateId, table.sortOrder),
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [projectTaskTemplate.id],
    name: "project_task_template_item_template_id_fkey",
  }),
]);

export const projectTaskTemplate = pgTable("project_task_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateCode: varchar("template_code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("project_task_template_template_code_key").on(table.templateCode),
]);

export const resourceEntry = pgTable("resource_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceCode: varchar("resource_code", { length: 120 }).notNull().unique(),
  projectId: uuid("project_id"),
  title: varchar("title", { length: 200 }).notNull(),
  resourceType: varchar("resource_type", { length: 80 }).notNull(),
  appId: varchar("app_id", { length: 100 }),
  publicUrl: text("public_url").notNull(),
  adminUrl: text("admin_url"),
  lifecycle: varchar("lifecycle", { length: 50 }).notNull().default('active'),
  verified: boolean("verified").notNull().default(false),
  verificationNote: text("verification_note"),
  sortOrder: integer("sort_order").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("resource_entry_resource_code_key").on(table.resourceCode),
  index("idx_resource_entry_project").on(table.projectId, table.lifecycle, table.sortOrder),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [researchProject.id],
    name: "resource_entry_project_id_fkey",
  }),
]);

export const researchProject = pgTable("research_project", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectCode: varchar("project_code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  clientName: varchar("client_name", { length: 200 }),
  category: varchar("category", { length: 100 }).notNull().default('品牌全案'),
  stageSnapshot: varchar("stage_snapshot", { length: 200 }).notNull().default('待确认'),
  projectStatus: varchar("project_status", { length: 50 }).notNull().default('active'),
  statusNote: text("status_note"),
  researchLocked: boolean("research_locked").notNull().default(true),
  archived: boolean("archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  progressPercent: integer("progress_percent").notNull().default(0),
  codexStatus: varchar("codex_status", { length: 50 }).notNull().default('idle'),
  currentStage: varchar("current_stage", { length: 200 }),
  currentTask: varchar("current_task", { length: 300 }),
  nextAction: text("next_action"),
  blocker: text("blocker"),
  codexThreadId: varchar("codex_thread_id", { length: 200 }),
  repoFullName: varchar("repo_full_name", { length: 300 }),
  repoLocalPath: text("repo_local_path"),
  lastSyncedAt: customTimestamptz("last_synced_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("research_project_project_code_key").on(table.projectCode),
  index("idx_research_project_status").on(table.projectStatus, table.archived, table.sortOrder),
]);

// table aliases
export const codexBridgeTable = codexBridge;
export const codexEventTable = codexEvent;
export const codexJobTable = codexJob;
export const projectTaskTable = projectTask;
export const projectTaskTemplateTable = projectTaskTemplate;
export const projectTaskTemplateItemTable = projectTaskTemplateItem;
export const researchProjectTable = researchProject;
export const resourceEntryTable = resourceEntry;
