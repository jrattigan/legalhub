import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { format } from "date-fns";
import { z } from "zod";
import {
  insertDealSchema,
  insertDocumentSchema,
  insertTaskSchema,
  insertIssueSchema,
  insertLawFirmSchema,
  insertAttorneySchema,
  insertDealCounselSchema,
  insertDocumentVersionSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Combined data endpoint for deals page
  app.get('/api/combined-data', async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(1); // Default to first user for demo
      const deals = await storage.getDeals();
      
      // For each deal, get the users
      const processedDeals = await Promise.all(deals.map(async (deal) => {
        const dealUsers = await storage.getDealUsers(deal.id);
        return {
          ...deal,
          users: dealUsers.map(du => du.user)
        };
      }));
      
      res.json({
        user,
        deals,
        processedDeals
      });
    } catch (error) {
      console.error('Error fetching combined data:', error);
      res.status(500).json({ error: 'Failed to fetch combined data' });
    }
  });
  const httpServer = createServer(app);

  // Users API
  app.get("/api/users", async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  });

  // Deals API
  app.get("/api/deals", async (req, res) => {
    const deals = await storage.getDeals();
    res.json(deals);
  });

  app.get("/api/deals/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const deal = await storage.getDeal(id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.json(deal);
  });

  app.post("/api/deals", async (req, res) => {
    try {
      // Ensure dueDate is properly converted to a Date object if it exists
      const data = req.body;
      if (data.dueDate && !(data.dueDate instanceof Date)) {
        data.dueDate = new Date(data.dueDate);
      }
      
      const validatedData = insertDealSchema.parse(data);
      const deal = await storage.createDeal(validatedData);
      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.patch("/api/deals/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    try {
      // Ensure dueDate is properly converted to a Date object if it exists
      const data = req.body;
      if (data.dueDate && !(data.dueDate instanceof Date)) {
        data.dueDate = new Date(data.dueDate);
      }
      
      const partialDealSchema = insertDealSchema.partial();
      const validatedData = partialDealSchema.parse(data);
      
      const updatedDeal = await storage.updateDeal(id, validatedData);
      if (!updatedDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      res.json(updatedDeal);
    } catch (error) {
      console.error("Error updating deal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  app.delete("/api/deals/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const success = await storage.deleteDeal(id);
    if (!success) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.status(204).end();
  });

  // Deal users API
  app.get("/api/deals/:id/users", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const dealUsers = await storage.getDealUsers(dealId);
    res.json(dealUsers);
  });

  // Documents API
  app.get("/api/deals/:id/documents", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const documents = await storage.getDocumentsByDeal(dealId);
    res.json(documents);
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json(document);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    try {
      const partialDocumentSchema = insertDocumentSchema.partial();
      const validatedData = partialDocumentSchema.parse(req.body);
      
      const updatedDocument = await storage.updateDocument(id, validatedData);
      if (!updatedDocument) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Document versions API
  app.get("/api/documents/:id/versions", async (req, res) => {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const versions = await storage.getDocumentVersions(documentId);
    res.json(versions);
  });

  app.get("/api/documents/:id/latestVersion", async (req, res) => {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const versionNumber = await storage.getLatestVersionNumber(documentId);
    res.json({ latestVersion: versionNumber });
  });

  app.post("/api/documents/:id/versions", async (req, res) => {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    try {
      // Get latest version number and increment it
      const latestVersionNumber = await storage.getLatestVersionNumber(documentId);
      
      const versionData = {
        ...req.body,
        documentId,
        version: latestVersionNumber + 1
      };
      
      const validatedData = insertDocumentVersionSchema.parse(versionData);
      const version = await storage.createDocumentVersion(validatedData);
      
      res.status(201).json(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid version data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document version" });
    }
  });

  app.get("/api/document-versions/compare", async (req, res) => {
    const versionId1 = parseInt(req.query.version1 as string);
    const versionId2 = parseInt(req.query.version2 as string);
    
    if (isNaN(versionId1) || isNaN(versionId2)) {
      return res.status(400).json({ message: "Invalid version IDs" });
    }

    try {
      const diff = await storage.compareDocumentVersions(versionId1, versionId2);
      res.json({ diff });
    } catch (error) {
      res.status(500).json({ message: "Failed to compare document versions" });
    }
  });

  // Tasks API
  app.get("/api/deals/:id/tasks", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const tasks = await storage.getTasksByDeal(dealId);
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      console.log("Received task creation request with body:", JSON.stringify(req.body));
      
      // Pre-process the request body to handle the date
      const processedBody = { ...req.body };
      if (processedBody.dueDate && typeof processedBody.dueDate === 'string') {
        processedBody.dueDate = new Date(processedBody.dueDate);
      }
      
      const validatedData = insertTaskSchema.parse(processedBody);
      console.log("Validated data:", JSON.stringify(validatedData));
      const task = await storage.createTask(validatedData);
      console.log("Task created successfully:", JSON.stringify(task));
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(error.errors));
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await storage.getTask(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      // Pre-process the request body to handle the date
      const processedBody = { ...req.body };
      if (processedBody.dueDate && typeof processedBody.dueDate === 'string') {
        processedBody.dueDate = new Date(processedBody.dueDate);
      }
      
      // Create a partial schema that allows updating only specific fields
      const partialSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        dueDate: z.union([z.date(), z.null()]).optional(),
        assigneeId: z.union([z.number(), z.null()]).optional(),
        completed: z.boolean().optional()
      });
      
      const validatedData = partialSchema.parse(processedBody);
      
      const updatedTask = await storage.updateTask(id, validatedData);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(error.errors));
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.post("/api/tasks/:id/complete", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const completedTask = await storage.completeTask(id);
    if (!completedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(completedTask);
  });

  // Issues API
  app.get("/api/deals/:id/issues", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const issues = await storage.getIssuesByDeal(dealId);
    res.json(issues);
  });

  app.post("/api/issues", async (req, res) => {
    try {
      const validatedData = insertIssueSchema.parse(req.body);
      const issue = await storage.createIssue(validatedData);
      res.status(201).json(issue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.get("/api/issues/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }

    const issue = await storage.getIssue(id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    res.json(issue);
  });

  app.patch("/api/issues/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }

    try {
      const partialIssueSchema = insertIssueSchema.partial();
      const validatedData = partialIssueSchema.parse(req.body);
      
      const updatedIssue = await storage.updateIssue(id, validatedData);
      if (!updatedIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      res.json(updatedIssue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid issue data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // Law Firms API
  app.get("/api/law-firms", async (req, res) => {
    const firms = await storage.getLawFirms();
    res.json(firms);
  });

  app.post("/api/law-firms", async (req, res) => {
    try {
      const validatedData = insertLawFirmSchema.parse(req.body);
      const firm = await storage.createLawFirm(validatedData);
      res.status(201).json(firm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid law firm data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create law firm" });
    }
  });

  // Attorneys API
  app.get("/api/law-firms/:id/attorneys", async (req, res) => {
    const firmId = parseInt(req.params.id);
    if (isNaN(firmId)) {
      return res.status(400).json({ message: "Invalid law firm ID" });
    }

    const attorneys = await storage.getAttorneysByFirm(firmId);
    res.json(attorneys);
  });

  app.post("/api/attorneys", async (req, res) => {
    try {
      const validatedData = insertAttorneySchema.parse(req.body);
      const attorney = await storage.createAttorney(validatedData);
      res.status(201).json(attorney);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attorney data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create attorney" });
    }
  });

  // Deal Counsels API
  app.get("/api/deals/:id/counsel", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const counsels = await storage.getDealCounsels(dealId);
    res.json(counsels);
  });

  app.post("/api/deal-counsels", async (req, res) => {
    try {
      const validatedData = insertDealCounselSchema.parse(req.body);
      const counsel = await storage.createDealCounsel(validatedData);
      res.status(201).json(counsel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deal counsel data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create deal counsel" });
    }
  });

  // Timeline API
  app.get("/api/deals/:id/timeline", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    const events = await storage.getTimelineEvents(dealId);
    res.json(events);
  });

  return httpServer;
}
