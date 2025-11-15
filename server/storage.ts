import { type FoodResource, type InsertFoodResource, type Submission, type InsertSubmission } from "@shared/schema";

export interface IStorage {
  getFoodResources(): Promise<FoodResource[]>;
  getFoodResource(id: string): Promise<FoodResource | undefined>;
  createFoodResource(resource: InsertFoodResource): Promise<FoodResource>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
}

export class MemStorage implements IStorage {
  private foodResources: FoodResource[] = [];
  private submissions: Submission[] = [];

  async getFoodResources(): Promise<FoodResource[]> {
    return this.foodResources;
  }

  async getFoodResource(id: string): Promise<FoodResource | undefined> {
    return this.foodResources.find(resource => resource.id === id);
  }

  async createFoodResource(resource: InsertFoodResource): Promise<FoodResource> {
    const newResource: FoodResource = {
      id: crypto.randomUUID(),
      name: resource.name,
      type: resource.type,
      address: resource.address,
      latitude: resource.latitude,
      longitude: resource.longitude,
      hours: resource.hours ?? null,
      distance: resource.distance ?? null,
      phone: resource.phone ?? null,
      appointmentRequired: resource.appointmentRequired ?? null,
    };
    this.foodResources.push(newResource);
    return newResource;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const newSubmission: Submission = {
      id: crypto.randomUUID(),
      submittedAt: new Date(),
      name: submission.name,
      type: submission.type,
      address: submission.address,
      latitude: submission.latitude,
      longitude: submission.longitude,
      hours: submission.hours ?? null,
      phone: submission.phone ?? null,
      appointmentRequired: submission.appointmentRequired ?? null,
      photoUrl: submission.photoUrl ?? null,
    };
    this.submissions.push(newSubmission);
    return newSubmission;
  }
}

export const storage = new MemStorage();
