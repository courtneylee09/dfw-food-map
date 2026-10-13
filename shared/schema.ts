import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const foodResources = pgTable("food_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  address: text("address").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  hours: text("hours"),
  distance: text("distance"),
  phone: text("phone"),
  appointmentRequired: boolean("appointment_required").default(false),
  lastVerifiedDate: timestamp("last_verified_date").defaultNow(),
  verificationSource: varchar("verification_source", { length: 50 }).default("initial"),
  reportedClosed: boolean("reported_closed").default(false),
  reportedClosedCount: varchar("reported_closed_count").default("0"),
  reportedClosedAt: timestamp("reported_closed_at"),
  // Short public note, e.g. "Not accepting new clients until Jan 2027"
  notes: text("notes"),
  // Hidden listings stay in the database but are not shown on the map
  hidden: boolean("hidden").default(false),
  hiddenReason: text("hidden_reason"),
  website: text("website"),
  googlePlaceId: text("google_place_id"),
  lastAgentCheckAt: timestamp("last_agent_check_at"),
});

// One row per verification agent check (see docs/VERIFICATION_AGENT.md)
export const verificationChecks = pgTable("verification_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceId: varchar("resource_id").notNull(),
  checkedAt: timestamp("checked_at").defaultNow(),
  trigger: varchar("trigger", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }),
  confidence: varchar("confidence", { length: 10 }),
  summary: text("summary"),
  evidence: jsonb("evidence"),
  proposedChanges: jsonb("proposed_changes"),
  conflicts: jsonb("conflicts"),
  // What the agent changed automatically: { field: { before, after } }, for undo
  appliedChanges: jsonb("applied_changes"),
  placesSnapshot: jsonb("places_snapshot"),
  error: text("error"),
  // auto_verified | auto_applied | auto_hidden | unconfirmed | pending | approved | changes_applied
  // | hidden | dismissed | superseded | reverted | error
  resolution: varchar("resolution", { length: 20 }).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolution_note"),
  model: varchar("model", { length: 50 }),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  webSearches: integer("web_searches"),
  costUsd: text("cost_usd"),
});

// Facts a human confirmed from a primary source (call, visit, the organization itself).
// The agent never overrides these; it raises a conflict instead.
export const fieldConfirmations = pgTable("field_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceId: varchar("resource_id").notNull(),
  // status | hours | phone | address | website | appointment_required | notes
  field: varchar("field", { length: 30 }).notNull(),
  value: text("value"),
  // admin_call | site_visit | org_contact
  source: varchar("source", { length: 20 }).notNull(),
  note: text("note"),
  confirmedAt: timestamp("confirmed_at").defaultNow(),
});

export type VerificationCheck = typeof verificationChecks.$inferSelect;
export type FieldConfirmation = typeof fieldConfirmations.$inferSelect;

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  address: text("address").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  hours: text("hours"),
  photoUrl: text("photo_url"),
  phone: text("phone"),
  appointmentRequired: boolean("appointment_required").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const userReports = pgTable("user_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceId: varchar("resource_id").notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'closed', 'incorrect_info', 'other'
  reportDetails: text("report_details"),
  reportedAt: timestamp("reported_at").defaultNow(),
  userIp: varchar("user_ip", { length: 50 }),
});

export const insertFoodResourceSchema = createInsertSchema(foodResources).omit({
  id: true,
  lastVerifiedDate: true,
  reportedClosedAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  reportedAt: true,
});

export type InsertFoodResource = z.infer<typeof insertFoodResourceSchema>;
export type FoodResource = typeof foodResources.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type UserReport = typeof userReports.$inferSelect;
