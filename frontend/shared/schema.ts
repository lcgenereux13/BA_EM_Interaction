import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Agent schema
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  icon: text("icon").notNull(),
  status: text("status").notNull().default("idle"),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  role: true,
  icon: true,
  status: true,
  color: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Agent output schema
export const agentOutputs = pgTable("agent_outputs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  content: text("content").notNull(),
  taskId: text("task_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAgentOutputSchema = createInsertSchema(agentOutputs).pick({
  agentId: true,
  content: true,
  taskId: true,
});

export type InsertAgentOutput = z.infer<typeof insertAgentOutputSchema>;
export type AgentOutput = typeof agentOutputs.$inferSelect;

// Task schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  taskId: text("task_id").notNull().unique(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  content: true,
  taskId: true,
  status: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// WebSocket message types for type safety
export type AgentStatusUpdate = {
  type: "agent_status";
  agentId: number;
  status: string;
};

export type AgentOutputMessage = {
  type: "agent_output";
  agentId: number;
  agentName: string;
  agentIcon: string;
  agentColor: string;
  content: string;
  timestamp: string;
  taskId: string;
};

export type SystemMessage = {
  type: "system_message";
  content: string;
  timestamp: string;
};

export type TaskSubmitMessage = {
  type: "task_submit";
  content: string;
};

export type TaskStatusMessage = {
  type: "task_status";
  taskId: string;
  status: string;
};

export type AgentMetricsMessage = {
  type: "agent_metrics";
  agentId: number;
  tasksCompleted: number;
  totalTasks: number;
  processingTime: number;
};

// Union type for all WebSocket message types
export type WebSocketMessage = 
  | AgentStatusUpdate 
  | AgentOutputMessage 
  | SystemMessage
  | TaskSubmitMessage
  | TaskStatusMessage
  | AgentMetricsMessage;
