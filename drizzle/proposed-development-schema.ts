import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/**
 * PROPOSED development-only tables. Not imported by drizzle.config.ts and
 * therefore NOT part of the current migration target. Review before enabling.
 * All foreign keys are scoped to application-owned IDs; ownership checks
 * must also be enforced in API procedures.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
}, table => [index("projects_owner_idx").on(table.ownerId)]);

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  name: varchar("name", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [index("campaigns_project_idx").on(table.projectId)]);

export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  campaignId: int("campaignId").references(() => campaigns.id),
  authorId: int("authorId").notNull().references(() => users.id),
  title: varchar("title", { length: 250 }).notNull(),
  body: text("body"),
  status: mysqlEnum("status", ["draft", "review", "approved", "rejected"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
}, table => [index("content_project_idx").on(table.projectId), index("content_campaign_idx").on(table.campaignId)]);

export const agentRuns = mysqlTable("agent_runs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  initiatedBy: int("initiatedBy").notNull().references(() => users.id),
  agentName: varchar("agentName", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["queued", "running", "succeeded", "failed", "cancelled"]).notNull().default("queued"),
  summary: text("summary"),
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [index("agent_runs_project_idx").on(table.projectId)]);

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").references(() => users.id),
  projectId: int("projectId").references(() => projects.id),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("targetType", { length: 80 }),
  targetId: varchar("targetId", { length: 100 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, table => [index("audit_events_actor_idx").on(table.actorId), index("audit_events_project_idx").on(table.projectId)]);
