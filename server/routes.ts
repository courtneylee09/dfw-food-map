import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(miles: number): string {
  if (miles < 0.1) return '< 0.1 mi';
  if (miles < 1) return `${miles.toFixed(1)} mi`;
  return `${miles.toFixed(1)} mi`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/resources", async (req, res) => {
    const resources = await storage.getFoodResources();
    
    const userLat = req.query.lat ? parseFloat(req.query.lat as string) : NaN;
    const userLng = req.query.lng ? parseFloat(req.query.lng as string) : NaN;
    const hasValidUserLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

    console.log(`[DEBUG] /api/resources called with lat=${userLat}, lng=${userLng}, hasValidUserLocation=${hasValidUserLocation}`);
    console.log(`[DEBUG] Total resources from storage: ${resources.length}`);

    let processedResources = resources.map(resource => {
      let distanceInMiles: number | null = null;
      
      if (hasValidUserLocation) {
        const resourceLat = parseFloat(resource.latitude);
        const resourceLng = parseFloat(resource.longitude);
        
        if (Number.isFinite(resourceLat) && Number.isFinite(resourceLng)) {
          const rawDistance = calculateDistance(userLat, userLng, resourceLat, resourceLng);
          // Round to 1 decimal place for consistent display and filtering
          distanceInMiles = Math.round(rawDistance * 10) / 10;
        }
      }
      
      return {
        ...resource,
        distance: distanceInMiles,
      };
    });

    if (hasValidUserLocation) {
      processedResources.sort((a, b) => {
        const distA = a.distance;
        const distB = b.distance;
        
        if (distA !== null && distB !== null) {
          return (distA as number) - (distB as number);
        }
        if (distA !== null) return -1;
        if (distB !== null) return 1;
        return 0;
      });
    }

    console.log(`[DEBUG] Returning ${processedResources.length} processed resources`);
    console.log(`[DEBUG] Sample resources:`, processedResources.slice(0, 2));
    
    res.json(processedResources);
  });

  app.get("/api/resources/:id", async (req, res) => {
    const resource = await storage.getFoodResource(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    res.json(resource);
  });

  app.post("/api/resources", async (req, res) => {
    try {
      const resource = await storage.createFoodResource(req.body);
      res.status(201).json(resource);
    } catch (error) {
      res.status(400).json({ message: "Failed to create resource" });
    }
  });

  app.post("/api/submissions", async (req, res) => {
    try {
      const submission = await storage.createSubmission(req.body);
      
      // Send email notification if configured
      if (process.env.ADMIN_EMAIL || process.env.GMAIL_USER) {
        const { notificationService } = await import('./notifications');
        notificationService.sendSubmissionNotification(submission).catch(err => {
          console.error('Notification error (non-blocking):', err);
        });
      }
      
      res.status(201).json(submission);
    } catch (error) {
      res.status(400).json({ message: "Failed to create submission" });
    }
  });

  // Get all submissions (for admin review)
  app.get("/api/submissions", async (req, res) => {
    try {
      const allSubmissions = await storage.getSubmissions();
      res.json(allSubmissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
