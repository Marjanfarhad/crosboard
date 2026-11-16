import { boolean, index, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { projects } from "./proposed-development-schema";

/**
 * DEVELOPMENT-ONLY proposed agent registry. No migration is generated/applied.
 * Provisioning must be an administrator-only out-of-band operation.
 */
export const agentRegistrations = mysqlTable("agent_registrations", {
  agentId: varchar("agentId", { length: 120 }).primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id),
  enabled: boolean("enabled").notNull().default(false),
  permissions: json("permissions").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
}, table => [index("agent_registry_project_idx").on(table.projectId)]);
