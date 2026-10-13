import type { Express } from "express";
import fs from "fs";
import path from "path";
import { createServer, type Server } from "http";
import { AuthError, createVerifier, getActivity, listVerifiers, login, logActivity, logout, requireRole, updateVerifier } from "./auth";
import { storage } from "./storage";
import { normalizeHours } from "@shared/hours";
import { LEGACY_CATEGORY_NAMES } from "@shared/categories";
import { getAutomaticChanges, getReviewQueue, getUnconfirmed, resolveCheck, ResolveError, undoCheck } from "./verification";

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
          distanceInMiles = calculateDistance(userLat, userLng, resourceLat, resourceLng);
        }
      }
      
      return {
        ...resource,
        type: LEGACY_CATEGORY_NAMES[resource.type] ?? resource.type,
        hours: normalizeHours({
          hours: resource.hours,
          type: resource.type,
          name: resource.name,
          phone: resource.phone,
          appointmentRequired: resource.appointmentRequired,
        }),
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

  // Admin list routes must be registered before /api/resources/:id,
  // otherwise Express treats "flagged" and "needs-verification" as an id

  // Get resources that need verification
  app.get("/api/resources/needs-verification", requireRole("admin", "verifier"), async (req, res) => {
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
  app.get("/api/resources/flagged", requireRole("admin", "verifier"), async (req, res) => {
    try {
      const resources = await storage.getFlaggedResources();
      res.json(resources);
    } catch (error) {
      console.error("Error fetching flagged resources:", error);
      res.status(500).json({ message: "Failed to fetch flagged resources" });
    }
  });

  app.get("/api/resources/:id", async (req, res) => {
    const resource = await storage.getFoodResource(req.params.id);
    if (!resource || resource.hidden) {
      return res.status(404).json({ message: "Resource not found" });
    }
    res.json({
      ...resource,
      type: LEGACY_CATEGORY_NAMES[resource.type] ?? resource.type,
      hours: normalizeHours({
        hours: resource.hours,
        type: resource.type,
        name: resource.name,
        phone: resource.phone,
        appointmentRequired: resource.appointmentRequired,
      }),
    });
  });

  app.post("/api/resources", requireRole("admin"), async (req, res) => {
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
  app.get("/api/submissions", requireRole("admin"), async (req, res) => {
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

  // Which build is running (the deploy workflow writes dist/version.json)
  app.get("/api/health", (_req, res) => {
    let sha = "unknown";
    try {
      sha = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "version.json"), "utf8")).sha ?? sha;
    } catch {
      // Local builds have no version file
    }
    res.json({ ok: true, sha });
  });

  // Sign-in for the review page
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { token, actor } = await login(req, req.body ?? {});
      res.json({ token, role: actor.role, name: actor.name });
    } catch (error) {
      if (error instanceof AuthError) return res.status(error.status).json({ message: error.message });
      console.error("Error signing in:", error);
      res.status(500).json({ message: "Sign-in failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      await logout(req);
      res.json({ message: "Signed out" });
    } catch (error) {
      console.error("Error signing out:", error);
      res.status(500).json({ message: "Sign-out failed" });
    }
  });

  app.get("/api/auth/me", requireRole("admin", "verifier"), (req, res) => {
    res.json({ role: req.actor!.role, name: req.actor!.name });
  });

  // Verifier accounts and the activity log (admin only)
  app.get("/api/admin/verifiers", requireRole("admin"), async (_req, res) => {
    res.json(await listVerifiers());
  });

  app.post("/api/admin/verifiers", requireRole("admin"), async (req, res) => {
    try {
      res.status(201).json(await createVerifier(req.actor!, req.body ?? {}));
    } catch (error) {
      if (error instanceof AuthError) return res.status(error.status).json({ message: error.message });
      console.error("Error creating verifier:", error);
      res.status(500).json({ message: "Failed to create verifier" });
    }
  });

  app.patch("/api/admin/verifiers/:id", requireRole("admin"), async (req, res) => {
    try {
      res.json(await updateVerifier(req.actor!, req.params.id, req.body ?? {}));
    } catch (error) {
      if (error instanceof AuthError) return res.status(error.status).json({ message: error.message });
      console.error("Error updating verifier:", error);
      res.status(500).json({ message: "Failed to update verifier" });
    }
  });

  app.get("/api/admin/activity", requireRole("admin"), async (_req, res) => {
    res.json(await getActivity());
  });

  // Verification agent review queue
  app.get("/api/admin/checks", requireRole("admin", "verifier"), async (req, res) => {
    try {
      const view = req.query.view;
      if (view === "auto") return res.json(await getAutomaticChanges());
      if (view === "unconfirmed") return res.json(await getUnconfirmed());
      res.json(await getReviewQueue());
    } catch (error) {
      console.error("Error fetching verification checks:", error);
      res.status(500).json({ message: "Failed to fetch verification checks" });
    }
  });

  app.post("/api/admin/checks/:id/resolve", requireRole("admin", "verifier"), async (req, res) => {
    try {
      const { action, changes, confirmedVia, note } = req.body ?? {};
      if (!["verify", "apply", "hide", "dismiss"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }
      if (confirmedVia && !["evidence", "admin_call", "site_visit", "org_contact"].includes(confirmedVia)) {
        return res.status(400).json({ message: "Invalid confirmation source" });
      }
      await resolveCheck(req.params.id, { action, changes, confirmedVia, note }, req.actor!);
      res.json({ message: "Resolved" });
    } catch (error) {
      if (error instanceof ResolveError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error resolving verification check:", error);
      res.status(500).json({ message: "Failed to resolve check" });
    }
  });

  app.post("/api/admin/checks/:id/undo", requireRole("admin", "verifier"), async (req, res) => {
    try {
      await undoCheck(req.params.id, req.actor!, req.body?.note);
      res.json({ message: "Undone" });
    } catch (error) {
      if (error instanceof ResolveError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Error undoing verification check:", error);
      res.status(500).json({ message: "Failed to undo" });
    }
  });

  // Mark a resource as verified
  app.post("/api/resources/:id/verify", requireRole("admin", "verifier"), async (req, res) => {
    try {
      const resource = await storage.getFoodResource(req.params.id);
      if (!resource) return res.status(404).json({ message: "Resource not found" });
      await storage.markResourceAsVerified(req.params.id, "manual");
      await logActivity(req.actor!, "report_cleared", {
        resourceId: resource.id,
        resourceName: resource.name,
        details: { reportedClosedCount: resource.reportedClosedCount },
      });
      res.json({ message: "Resource marked as verified" });
    } catch (error) {
      console.error("Error verifying resource:", error);
      res.status(500).json({ message: "Failed to verify resource" });
    }
  });

  // Remove a resource (if confirmed closed)
  app.delete("/api/resources/:id", requireRole("admin"), async (req, res) => {
    try {
      const resource = await storage.getFoodResource(req.params.id);
      if (!resource) return res.status(404).json({ message: "Resource not found" });
      await storage.removeResource(req.params.id);
      await logActivity(req.actor!, "listing_deleted", {
        resourceId: resource.id,
        resourceName: resource.name,
        details: { address: resource.address, type: resource.type },
      });
      res.json({ message: "Resource removed successfully" });
    } catch (error) {
      console.error("Error removing resource:", error);
      res.status(500).json({ message: "Failed to remove resource" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
