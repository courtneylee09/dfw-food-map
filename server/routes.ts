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

  // Report a resource as closed or problematic
  app.post("/api/resources/:id/report", async (req, res) => {
    try {
      const { reportType, reportDetails, userIp } = req.body;
      const resourceId = req.params.id;

      // Verify resource exists
      const resource = await storage.getFoodResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      // Create the report
      const report = await storage.createUserReport({
        resourceId,
        reportType: reportType || 'closed',
        reportDetails: reportDetails || null,
        userIp: userIp || req.ip || null,
      });

      // If it's a "closed" report, increment the closed count
      if (reportType === 'closed') {
        await storage.incrementReportedClosed(resourceId);
      }

      res.status(201).json({ message: "Report submitted successfully", report });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // Get resources that need verification
  app.get("/api/resources/needs-verification", async (req, res) => {
    try {
      const daysOld = req.query.days ? parseInt(req.query.days as string) : 60;
      const resources = await storage.getResourcesNeedingVerification(daysOld);
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources needing verification:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Get flagged resources (reported as closed)
  app.get("/api/resources/flagged", async (req, res) => {
    try {
      const resources = await storage.getFlaggedResources();
      res.json(resources);
    } catch (error) {
      console.error("Error fetching flagged resources:", error);
      res.status(500).json({ message: "Failed to fetch flagged resources" });
    }
  });

  // Mark a resource as verified
  app.post("/api/resources/:id/verify", async (req, res) => {
    try {
      const { source } = req.body;
      await storage.markResourceAsVerified(req.params.id, source || 'manual');
      res.json({ message: "Resource marked as verified" });
    } catch (error) {
      console.error("Error verifying resource:", error);
      res.status(500).json({ message: "Failed to verify resource" });
    }
  });

  // Remove a resource (if confirmed closed)
  app.delete("/api/resources/:id", async (req, res) => {
    try {
      await storage.removeResource(req.params.id);
      res.json({ message: "Resource removed successfully" });
    } catch (error) {
      console.error("Error removing resource:", error);
      res.status(500).json({ message: "Failed to remove resource" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
