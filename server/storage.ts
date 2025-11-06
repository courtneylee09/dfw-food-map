import { type FoodResource, type InsertFoodResource, type Submission, type InsertSubmission } from "@shared/schema";
import { db } from "./db";
import { foodResources, submissions } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getFoodResources(): Promise<FoodResource[]>;
  getFoodResource(id: string): Promise<FoodResource | undefined>;
  createFoodResource(resource: InsertFoodResource): Promise<FoodResource>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
}

export class DbStorage implements IStorage {
  async getFoodResources(): Promise<FoodResource[]> {
    return await db.select().from(foodResources);
  }

  async getFoodResource(id: string): Promise<FoodResource | undefined> {
    const results = await db.select().from(foodResources).where(eq(foodResources.id, id));
    return results[0];
  }

  async createFoodResource(resource: InsertFoodResource): Promise<FoodResource> {
    const results = await db.insert(foodResources).values(resource).returning();
    return results[0];
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const results = await db.insert(submissions).values(submission).returning();
    return results[0];
  }
}

export const storage = new DbStorage();
