import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
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
});

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
