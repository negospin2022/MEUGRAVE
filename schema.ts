import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type VocalMetrics = {
  ies: number;
  cet: number;
  irl: number;
  eac: number | null;
  ftr: number | null;
  f0Average?: number | null;
};

export type WordDifference = {
  type: "omitted" | "inserted" | "substituted";
  expected?: string;
  received?: string;
};

export const vocalSessions = mysqlTable("vocalSessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  exerciseId: int("exerciseId").notNull(),
  blockId: varchar("blockId", { length: 24 }).default("bloco-1").notNull(),
  frontId: varchar("frontId", { length: 64 }).default("rotina-semanal").notNull(),
  dayId: varchar("dayId", { length: 24 }).notNull(),
  levelId: varchar("levelId", { length: 24 }).notNull(),
  status: mysqlEnum("status", ["partial", "complete"]).default("partial").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vocalRecordings = mysqlTable("vocalRecordings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 64 })
    .notNull()
    .references(() => vocalSessions.id, { onDelete: "cascade" }),
  part: mysqlEnum("part", ["A", "B"]).notNull(),
  attemptNumber: int("attemptNumber").default(1).notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  storageUrl: text("storageUrl"),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  transcript: text("transcript"),
  metrics: json("metrics").$type<VocalMetrics>(),
  score: int("score"),
  reliability: int("reliability"),
  feedback: text("feedback"),
  wordDifferences: json("wordDifferences").$type<WordDifference[]>(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VocalSession = typeof vocalSessions.$inferSelect;
export type InsertVocalSession = typeof vocalSessions.$inferInsert;
export type VocalRecording = typeof vocalRecordings.$inferSelect;
export type InsertVocalRecording = typeof vocalRecordings.$inferInsert;
