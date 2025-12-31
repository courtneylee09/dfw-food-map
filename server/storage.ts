import { type FoodResource, type InsertFoodResource, type Submission, type InsertSubmission } from "@shared/schema";
import { db } from "./db";
import { foodResources, submissions } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getFoodResources(): Promise<FoodResource[]>;
  getFoodResource(id: string): Promise<FoodResource | undefined>;
  createFoodResource(resource: InsertFoodResource): Promise<FoodResource>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissions(): Promise<Submission[]>;
}

export class MemStorage implements IStorage {
  private foodResources: FoodResource[] = [
    {
      id: '1',
      name: 'Community Food Resource',
      type: 'Food Pantry',
      address: '1854 Shanna Dr, Lancaster, TX 75134',
      latitude: '32.5921',
      longitude: '-96.7561',
      hours: 'Mon-Fri: 9:00am-5:00pm',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
    {
      id: '2',
      name: 'Dallas Food Bank',
      type: 'Food Pantry',
      address: '4500 S Cockrell Hill Rd, Dallas, TX 75236',
      latitude: '32.5680',
      longitude: '-96.8145',
      hours: 'Mon-Sat: 8:00am-4:00pm',
      distance: null,
      phone: '(214) 330-1396',
      appointmentRequired: false,
    },
    {
      id: '3',
      name: 'Community Fridge - Oak Cliff',
      type: 'Community Fridge',
      address: '123 Main St, Dallas, TX 75208',
      latitude: '32.7505',
      longitude: '-96.8369',
      hours: '24/7',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
    // Additional DFW test entries (so the app shows these without DB)
    {
      id: 'dfw-crossroads-1',
      name: 'Crossroads Community Services',
      type: 'Food Pantry',
      address: '4500 S Cockrell Hill Rd, Dallas, TX 75236',
      latitude: '32.5680',
      longitude: '-96.8145',
      hours: 'Mon-Thu 8:30AM-11:30AM; Fri 9AM-12PM',
      distance: null,
      phone: '(214) 560-2511',
      appointmentRequired: true,
    },
    {
      id: 'dfw-stewpot-1',
      name: 'The Stewpot (Food Pantry)',
      type: 'Food Pantry',
      address: '1610 S Malcolm X Blvd, Bldg 350, Dallas, TX 75226',
      latitude: '32.7598',
      longitude: '-96.7643',
      hours: 'Mon-Fri 9AM-3PM',
      distance: null,
      phone: '(214) 746-2785',
      appointmentRequired: true,
    },
    {
      id: 'dfw-union-gospel-1',
      name: 'Union Gospel Mission Tarrant County',
      type: 'Hot Meal',
      address: '1331 E Lancaster Ave, Fort Worth, TX 76102',
      latitude: '32.7393',
      longitude: '-97.2953',
      hours: 'Breakfast: 7AM; Lunch: 12:15PM; Dinner: 4PM',
      distance: null,
      phone: '(817) 339-2553',
      appointmentRequired: false,
    },
    {
      id: 'dfw-funkyfridge-1',
      name: 'Funky Town Fridge (South Main)',
      type: 'Community Fridge',
      address: '825 S Main St, Fort Worth, TX 76104',
      latitude: '32.7408',
      longitude: '-97.3197',
      hours: '24/7',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
    {
      id: 'dfw-soupmobile-1',
      name: 'SoupMobile',
      type: 'Soup Kitchen',
      address: '2490 Coombs St, Dallas, TX 75215',
      latitude: '32.7859',
      longitude: '-96.7749',
      hours: 'Mobile service - check website for schedule',
      distance: null,
      phone: '(214) 655-6325',
      appointmentRequired: false,
    },
    {
      id: 'dfw-salvation-mckinney-1',
      name: 'Salvation Army (McKinney)',
      type: 'Food Pantry',
      address: '600 Wilson Creek Pkwy, McKinney, TX 75069',
      latitude: '33.1972',
      longitude: '-96.6239',
      hours: 'Mon/Wed/Fri 9:30AM-11:30AM',
      distance: null,
      phone: '(972) 542-6694',
      appointmentRequired: false,
    },
    {
      id: 'dfw-older-adult-services-1',
      name: 'Dallas County Older Adult Services',
      type: 'Senior Meals',
      address: 'Various locations, Dallas, TX',
      latitude: '32.7767',
      longitude: '-96.7970',
      hours: 'Provides free meals at 18 senior centers',
      distance: null,
      phone: '(214) 819-1860',
      appointmentRequired: true,
    },
    {
      id: '4',
      name: 'Hot Meal Program',
      type: 'Hot Meal',
      address: '500 Elm St, Dallas, TX 75202',
      latitude: '32.7767',
      longitude: '-96.7970',
      hours: 'Daily: 11:00am-1:00pm',
      distance: null,
      phone: '(214) 555-1234',
      appointmentRequired: false,
    },
    // New batch of 18 Dallas locations
    {
      id: 'citysquare-1',
      name: 'CitySquare Food Pantry',
      type: 'Food Pantry',
      address: '1610 S Malcolm X Blvd, Dallas, TX 75226',
      latitude: '32.7598',
      longitude: '-96.7643',
      hours: 'Tue-Fri 9:00AM-4:00PM',
      distance: null,
      phone: '(214) 823-8710',
      appointmentRequired: false,
    },
    {
      id: 'crossroads-2',
      name: 'Crossroads Community Services',
      type: 'Food Pantry',
      address: '4500 S Cockrell Hill Rd, Dallas, TX 75236',
      latitude: '32.5680',
      longitude: '-96.8145',
      hours: 'Mon-Thu 8:30AM-1:30PM (Appt only)',
      distance: null,
      phone: '(214) 560-2511',
      appointmentRequired: true,
    },
    {
      id: 'minnies-1',
      name: 'Minnie\'s Food Pantry',
      type: 'Food Pantry',
      address: '661 18th St, Plano, TX 75074',
      latitude: '33.0095',
      longitude: '-96.6967',
      hours: 'Wed-Sat 8:30AM-11:30AM',
      distance: null,
      phone: '(972) 596-0253',
      appointmentRequired: false,
    },
    {
      id: 'sharing-life-1',
      name: 'Sharing Life Community Outreach',
      type: 'Food Pantry',
      address: '3795 W. Emporium Circle, Mesquite, TX 75150',
      latitude: '32.3589',
      longitude: '-96.6194',
      hours: 'Mon-Thu 9AM-3PM; Fri 9AM-12PM; Tue 5PM-7PM',
      distance: null,
      phone: '(972) 285-5819',
      appointmentRequired: false,
    },
    {
      id: 'jan-pruitt-1',
      name: 'Jan Pruitt Community Pantry',
      type: 'Food Pantry',
      address: '123 Alexander Ave, Lancaster, TX 75146',
      latitude: '32.6192',
      longitude: '-96.7819',
      hours: 'Tue/Thu/Sat 8AM-2PM; Wed/Fri 12PM-3PM',
      distance: null,
      phone: '(972) 591-7849',
      appointmentRequired: false,
    },
    {
      id: 'bridge-1',
      name: 'The Bridge (Second Chance Café)',
      type: 'Soup Kitchen',
      address: '1610 S Malcolm X Blvd, Dallas, TX 75226',
      latitude: '32.7598',
      longitude: '-96.7643',
      hours: 'Breakfast 7:30AM-8:30AM; Lunch 12PM-1PM',
      distance: null,
      phone: '(214) 670-1100',
      appointmentRequired: false,
    },
    {
      id: 'union-gospel-2',
      name: 'Union Gospel Mission (Calvert Place)',
      type: 'Soup Kitchen',
      address: '3211 Irving Blvd, Dallas, TX 75247',
      latitude: '32.7751',
      longitude: '-96.8428',
      hours: 'Daily meals (Check schedule)',
      distance: null,
      phone: '(214) 637-6117',
      appointmentRequired: false,
    },
    {
      id: 'ourcalling-1',
      name: 'OurCalling',
      type: 'Hot Meal',
      address: '1702 S Cesar Chavez Blvd, Dallas, TX 75215',
      latitude: '32.7722',
      longitude: '-96.7857',
      hours: 'Mon-Fri 8:30AM-3PM (Lunch served)',
      distance: null,
      phone: '(214) 444-8796',
      appointmentRequired: false,
    },
    {
      id: 'soupmobile-2',
      name: 'SoupMobile',
      type: 'Hot Meal',
      address: '2490 Coombs St, Dallas, TX 75215',
      latitude: '32.7859',
      longitude: '-96.7749',
      hours: 'Mobile distribution (Check website)',
      distance: null,
      phone: '(214) 655-6325',
      appointmentRequired: false,
    },
    {
      id: 'brother-bill-1',
      name: 'Brother Bill\'s Helping Hand',
      type: 'Grocery Distribution',
      address: '3906 N. Westmoreland Rd, Dallas, TX 75212',
      latitude: '32.8374',
      longitude: '-96.7923',
      hours: 'Mon-Fri (Grocery Store Model - Appt Required)',
      distance: null,
      phone: '(214) 638-2196',
      appointmentRequired: true,
    },
    {
      id: 'oak-cliff-veggie-1',
      name: 'Oak Cliff Veggie Project',
      type: 'Grocery Distribution',
      address: '7227 S Westmoreland Rd, Dallas, TX 75237',
      latitude: '32.5932',
      longitude: '-96.8249',
      hours: 'Periodic distributions (Redbird Landing)',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
    {
      id: 'jefferson-senior-1',
      name: 'Jefferson Senior Center',
      type: 'Senior Meals',
      address: '1617 W. Jefferson Blvd, Dallas, TX 75208',
      latitude: '32.7643',
      longitude: '-96.8176',
      hours: 'Mon-Fri 8AM-1PM (Congregate Meal)',
      distance: null,
      phone: '(214) 946-1369',
      appointmentRequired: true,
    },
    {
      id: 'mlk-senior-1',
      name: 'MLK Senior Center',
      type: 'Senior Meals',
      address: '2901 Pennsylvania Ave, Dallas, TX 75215',
      latitude: '32.7714',
      longitude: '-96.7652',
      hours: 'Mon-Fri 8AM-1PM (Congregate Meal)',
      distance: null,
      phone: '(214) 670-8418',
      appointmentRequired: true,
    },
    {
      id: 'west-dallas-senior-1',
      name: 'West Dallas Senior Center',
      type: 'Senior Meals',
      address: '2828 Fish Trap Rd, Dallas, TX 75212',
      latitude: '32.8198',
      longitude: '-96.8439',
      hours: 'Mon-Fri 8AM-1PM (Congregate Meal)',
      distance: null,
      phone: '(214) 670-6550',
      appointmentRequired: true,
    },
    {
      id: 'harry-stone-1',
      name: 'Harry Stone Montessori (CACFP)',
      type: 'Youth Supper (CACFP)',
      address: '4747 Veterans Dr, Dallas, TX 75216',
      latitude: '32.7515',
      longitude: '-96.6780',
      hours: 'After School Meal (School Days)',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
    {
      id: 'martin-weiss-1',
      name: 'Martin Weiss Rec Center (CACFP)',
      type: 'Youth Supper (CACFP)',
      address: '8601 Willoughby Blvd, Dallas, TX 75232',
      latitude: '32.6847',
      longitude: '-96.5964',
      hours: 'After School Meal (School Days)',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
    {
      id: 'pleasant-oaks-1',
      name: 'Pleasant Oaks Rec Center (CACFP)',
      type: 'Youth Supper (CACFP)',
      address: '8701 Greenmound Ave, Dallas, TX 75227',
      latitude: '32.6476',
      longitude: '-96.5583',
      hours: 'After School Meal (School Days)',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
    {
      id: 'funky-town-poly-1',
      name: 'Funky Town Fridge (Poly)',
      type: 'Community Fridge',
      address: '2308 Vaughn Blvd, Fort Worth, TX 76105',
      latitude: '32.7354',
      longitude: '-97.3156',
      hours: '24/7 Access',
      distance: null,
      phone: null,
      appointmentRequired: false,
    },
  ];
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

  async getSubmissions(): Promise<Submission[]> {
    return this.submissions;
  }
}

export class DbStorage implements IStorage {
  async getFoodResources(): Promise<FoodResource[]> {
    if (!db) {
      throw new Error("Database not configured");
    }
    return await db.select().from(foodResources);
  }

  async getFoodResource(id: string): Promise<FoodResource | undefined> {
    if (!db) {
      throw new Error("Database not configured");
    }
    const results = await db.select().from(foodResources).where(eq(foodResources.id, id)).limit(1);
    return results[0];
  }

  async createFoodResource(resource: InsertFoodResource): Promise<FoodResource> {
    if (!db) {
      throw new Error("Database not configured");
    }
    const [newResource] = await db.insert(foodResources).values(resource).returning();
    return newResource;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    if (!db) {
      throw new Error("Database not configured");
    }
    const [newSubmission] = await db.insert(submissions).values(submission).returning();
    return newSubmission;
  }

  async getSubmissions(): Promise<Submission[]> {
    if (!db) {
      throw new Error("Database not configured");
    }
    return await db.select().from(submissions).orderBy(submissions.submittedAt);
  }
}

// Create a function that returns the appropriate storage at runtime
function getStorage(): IStorage {
  if (process.env.DATABASE_URL && db) {
    console.log("✓ Using database storage (DbStorage)");
    return new DbStorage();
  } else {
    console.log("⚠️  Using in-memory storage (MemStorage) - DATABASE_URL not configured");
    return new MemStorage();
  }
}

// Export storage as a getter property that evaluates at runtime
export const storage = getStorage();
