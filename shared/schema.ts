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
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertFoodResourceSchema = createInsertSchema(foodResources).omit({
  id: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

export type InsertFoodResource = z.infer<typeof insertFoodResourceSchema>;
export type FoodResource = typeof foodResources.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
