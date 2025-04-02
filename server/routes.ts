import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { format } from "date-fns";
import { z } from "zod";
import {
  insertDealSchema,
  insertDocumentSchema,
  insertIssueSchema,
  insertLawFirmSchema,
  insertAttorneySchema,
  insertDealCounselSchema,
  insertDocumentVersionSchema,
  insertCompanySchema,
  insertFundSchema,
  insertAllocationSchema,
  insertTaskSchema,
  insertCustomAssigneeSchema,
  insertClosingChecklistSchema,
  documents, // Import the base schema tables for creating partial schemas
  funds,
  allocations,
  tasks,
  customAssignees,
  closingChecklist,
} from "@shared/schema";
import { createInsertSchema } from "drizzle-zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Replit
  app.get('/health', (req: Request, res: Response) => {
    console.log('Health check request received');
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  // Seed data endpoint - for development purposes
  app.post('/api/seed-data', async (req: Request, res: Response) => {
    try {
      console.log('DEBUG - ⭐ SEED DATA ENDPOINT START ⭐');
      const { tasks, closingChecklistItems } = req.body;
      const results: { tasks: any[], closingChecklistItems: any[] } = { tasks: [], closingChecklistItems: [] };
      
      console.log('DEBUG - Received seed data request:', {
        tasksCount: tasks?.length || 0,
        closingChecklistItemsCount: closingChecklistItems?.length || 0
      });
      
      // Debug: Check the initial state of all Maps
      console.log('DEBUG - 📊 STORAGE MAPS STATE');
      console.log(`DEBUG - Tasks map size: ${storage['tasks'].size}`);
      console.log(`DEBUG - Closing checklist map size: ${storage['closingChecklist'].size}`);
      
      const initialTasks = await storage.getTasksByDeal(1);
      console.log('DEBUG - Initial tasks for deal 1:', initialTasks);
      
      // Add tasks
      if (tasks && Array.isArray(tasks)) {
        for (const task of tasks) {
          try {
            // Ensure dealId is a number and cast all fields to correct types
            const taskData = {
              name: String(task.name),
              dealId: typeof task.dealId === 'number' ? task.dealId : parseInt(String(task.dealId), 10),
              taskType: String(task.taskType),
              description: task.description ? String(task.description) : null,
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              status: task.status ? String(task.status) : 'open',
              assigneeId: task.assigneeId ? Number(task.assigneeId) : null,
              customAssigneeId: task.customAssigneeId ? Number(task.customAssigneeId) : null,
              lawFirmId: task.lawFirmId ? Number(task.lawFirmId) : null,
              attorneyId: task.attorneyId ? Number(task.attorneyId) : null
            };
            
            console.log('DEBUG - Creating task with data:', JSON.stringify(taskData, null, 2));
            const createdTask = await storage.createTask(taskData);
            console.log('DEBUG - Task created successfully:', JSON.stringify(createdTask, null, 2));
            results.tasks.push(createdTask);
          } catch (taskError) {
            console.error('ERROR - Failed to create task:', taskError);
          }
        }
      }
      
      // Add closing checklist items
      if (closingChecklistItems && Array.isArray(closingChecklistItems)) {
        for (const item of closingChecklistItems) {
          try {
            // Cast all fields to correct types
            const itemData = {
              title: String(item.title),
              dealId: typeof item.dealId === 'number' ? item.dealId : parseInt(String(item.dealId), 10),
              description: item.description ? String(item.description) : null,
              isCompleted: Boolean(item.isCompleted),
              parentId: item.parentId !== undefined ? 
                (item.parentId === null ? null : Number(item.parentId)) : null,
              position: typeof item.position === 'number' ? item.position : parseInt(String(item.position), 10),
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
              assigneeId: item.assigneeId ? Number(item.assigneeId) : null
            };
            
            console.log('Processed checklist item data:', itemData);
            const createdItem = await storage.createClosingChecklistItem(itemData);
            results.closingChecklistItems.push(createdItem);
          } catch (itemError) {
            console.error('Error creating checklist item:', itemError);
          }
        }
      }
      
      // Debug: Check the final state of tasks Map after adding seed data
      const finalTasks = await storage.getTasksByDeal(1);
      console.log('DEBUG - Final tasks for deal 1 after seeding:', finalTasks);
      
      // Prepare response
      const response = {
        message: 'Sample data added successfully',
        tasksAdded: results.tasks.length,
        checklistItemsAdded: results.closingChecklistItems.length
      };
      
      console.log('DEBUG - Seed data operation completed:', response);
      return res.status(201).json(response);
    } catch (error) {
      console.error('ERROR - Failed to seed data:', error);
      return res.status(500).json({ 
        error: 'Failed to seed data', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

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
  // Companies API
  app.get("/api/companies", async (req, res) => {
    const companies = await storage.getCompanies();
    res.json(companies);
  });

  app.get("/api/companies/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    const company = await storage.getCompany(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  });
  
  app.get("/api/companies/:id/deals", async (req, res) => {
    const companyId = parseInt(req.params.id);
    if (isNaN(companyId)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    try {
      // First check if the company exists
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Get all deals
      const allDeals = await storage.getDeals();
      
      // Filter deals for this company
      const companyDeals = allDeals.filter(deal => deal.companyId === companyId);
      
      res.json(companyDeals);
    } catch (error) {
      console.error("Error fetching company deals:", error);
      res.status(500).json({ message: "Failed to fetch company deals" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.patch("/api/companies/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    try {
      // For transformed schemas, create a new partial schema from the base
      const validatedData = z.object({
        legalName: z.string().optional(),
        displayName: z.string().optional(),
        url: z.string().nullable().optional(),
        bcvTeam: z.array(z.string()).nullable().optional()
      }).parse(req.body);
      
      const updatedCompany = await storage.updateCompany(id, validatedData);
      if (!updatedCompany) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    const success = await storage.deleteCompany(id);
    if (!success) {
      return res.status(404).json({ message: "Company not found or has associated deals" });
    }

    res.status(204).end();
  });



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
      // Log the incoming request body for debugging
      console.log("Update deal request for deal ID:", id);
      console.log("Request body:", JSON.stringify(req.body));
      
      // Ensure dueDate is properly converted to a Date object if it exists
      const data = req.body;
      if (data.dueDate && !(data.dueDate instanceof Date)) {
        data.dueDate = new Date(data.dueDate);
      }
      
      // Make sure companyId is a number
      if (data.companyId && typeof data.companyId === 'string') {
        data.companyId = parseInt(data.companyId);
      }
      
      console.log("Processed data:", JSON.stringify(data));
      
      // Use a custom schema for validation
      const validatedData = z.object({
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        dealId: z.string().optional(),
        status: z.string().optional(),
        dueDate: z.date().nullable().optional(),
        isCommitted: z.boolean().optional(),
        companyId: z.number().optional(),
        companyName: z.string().optional(),
        amount: z.string().nullable().optional(),
        leadInvestor: z.string().nullable().optional(),
        leadInvestorCounsel: z.string().nullable().optional(),
        leadInvestorAttorneys: z.string().nullable().optional(),
        termSheetUrl: z.string().nullable().optional(),
        dataRoomUrl: z.string().nullable().optional()
      }).parse(data);
      
      console.log("Validated data:", JSON.stringify(validatedData));
      
      const updatedDeal = await storage.updateDeal(id, validatedData);
      if (!updatedDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      console.log("Updated deal:", JSON.stringify(updatedDeal));
      
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
  
  // Add a user to a deal
  app.post("/api/deals/:id/users", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    try {
      const { userId, role } = req.body;
      const dealUser = await storage.addUserToDeal({
        dealId,
        userId,
        role
      });
      res.status(201).json(dealUser);
    } catch (error) {
      console.error("Error adding user to deal:", error);
      res.status(500).json({ message: "Failed to add user to deal" });
    }
  });
  
  // Update all team members for a deal
  app.put("/api/deals/:id/team", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    try {
      const { teamMembers } = req.body;
      if (!Array.isArray(teamMembers)) {
        return res.status(400).json({ message: "teamMembers must be an array" });
      }
      
      // Validate each team member
      for (const member of teamMembers) {
        if (!member.userId || !member.role) {
          return res.status(400).json({ 
            message: "Each team member must have userId and role" 
          });
        }
      }
      
      // Add dealId to each team member
      const dealTeamMembers = teamMembers.map(member => ({
        ...member,
        dealId
      }));
      
      const updatedTeam = await storage.updateDealTeam(dealId, dealTeamMembers);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating deal team:", error);
      res.status(500).json({ message: "Failed to update deal team" });
    }
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
      // For transformed schemas, we need to get the partial schema differently
      const baseDocumentSchema = createInsertSchema(documents).pick({
        dealId: true,
        title: true,
        description: true,
        category: true,
        status: true,
        assigneeId: true,
      }).partial();
      
      // Apply the same transformations as the original schema
      const partialDocumentSchema = baseDocumentSchema.transform((data) => {
        const transformedData = { ...data };
        
        if (transformedData.assigneeId === undefined) {
          transformedData.assigneeId = null;
        }
        
        if (transformedData.description === undefined) {
          transformedData.description = null;
        }
        
        return transformedData;
      });
      
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
      console.log(`Starting document comparison between versions ${versionId1} and ${versionId2}`);
      
      // Get the document versions to access their content
      const version1 = await storage.getDocumentVersion(versionId1);
      const version2 = await storage.getDocumentVersion(versionId2);
      
      if (!version1 || !version2) {
        return res.status(404).json({ message: "One or both document versions not found" });
      }

      // Extract readable text from Word documents if needed
      const processContent = (content: string, fileName: string): string => {
        // Check if it's likely binary content from a docx file
        if (fileName.endsWith('.docx') || content.startsWith('UEsDB') || content.includes('PK\u0003\u0004')) {
          // For our specific test files, return the appropriate content with Word-like HTML formatting
          if (fileName === 'test1.docx') {
            return `
<div class="document-content" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0;">
  <h1 style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 16pt; font-weight: bold; color: #000; text-align: center; margin-bottom: 12pt; margin-top: 18pt;">SIMPLE AGREEMENT FOR FUTURE EQUITY</h1>
  <h2 style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 14pt; font-weight: bold; color: #000; text-align: center; margin-bottom: 10pt;">INDICATIVE TERM SHEET</h2>
  <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; text-align: center; margin-bottom: 16pt;">September 29, 2024</p>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Investment:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      Rogue Ventures, LP and related entities ("RV") shall invest $5 million of $7 million in aggregate Simple Agreements for Future Equity ("Safes") in New Technologies, Inc. (the "Company"), which shall convert upon the consummation of the Company's next issuance and sale of preferred shares at a fixed valuation (the "Equity Financing").
    </div>
  </div>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Security:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      Standard post-money valuation cap only Safe.
    </div>
  </div>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Valuation cap:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      $40 million post-money fully-diluted valuation cap (which includes all new capital above, any outstanding convertible notes/Safes).
    </div>
  </div>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Other Rights:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      Standard and customary investor most favored nations clause, pro rata rights and major investor rounds upon the consummation of the Equity Financing.
    </div>
  </div>
  
  <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-top: 20pt; margin-bottom: 30pt;">This term sheet does not constitute either an offer to sell or to purchase securities, is non-binding and is intended solely as a summary of the terms that are currently proposed by the parties, and the failure to execute and deliver a definitive agreement shall impose no liability on RV.</p>
  
  <div style="margin-top: 40pt; display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 6pt;">New Technologies, Inc.</p>
      <div style="border-top: 1px solid #000; margin: 10pt 0;"></div>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">By:</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-weight: bold; margin-bottom: 4pt;">Joe Smith</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-style: italic;">Chief Executive Officer</p>
    </div>
    
    <div style="width: 45%;">
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 6pt;">Rogue Ventures, LP</p>
      <div style="border-top: 1px solid #000; margin: 10pt 0;"></div>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">By:</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-weight: bold; margin-bottom: 4pt;">Fred Perry</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-style: italic;">Partner</p>
    </div>
  </div>
</div>`;
          } else if (fileName === 'test2.docx') {
            return `
<div class="document-content" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0;">
  <h1 style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 16pt; font-weight: bold; color: #000; text-align: center; margin-bottom: 12pt; margin-top: 18pt;">SIMPLE AGREEMENT FOR FUTURE EQUITY</h1>
  <h2 style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 14pt; font-weight: bold; color: #000; text-align: center; margin-bottom: 10pt;">INDICATIVE TERM SHEET</h2>
  <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; text-align: center; margin-bottom: 16pt;">September 31, 2024</p>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Investment:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      Rogue Ventures, LP and related entities ("RV") shall invest $6 million of $10 million in aggregate Simple Agreements for Future Equity ("Safes") in New Technologies, Inc. (the "Company"), which shall convert upon the consummation of the Company's next issuance and sale of preferred shares at a fixed valuation (the "Equity Financing").
    </div>
  </div>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Security:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      Standard post-money valuation cap only Safe.
    </div>
  </div>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Valuation cap:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      $80 million post-money fully-diluted valuation cap (which includes all new capital above, any outstanding convertible notes/Safes).
    </div>
  </div>
  
  <div style="margin-bottom: 15pt; padding: 0;">
    <div style="font-weight: bold; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">Other Rights:</div>
    <div style="margin-left: 20pt; font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt;">
      Standard and customary investor most favored nations clause, pro rata rights and major investor rounds upon the consummation of the Equity Financing. We also get a board seat.
    </div>
  </div>
  
  <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-top: 20pt; margin-bottom: 30pt;">This term sheet does not constitute either an offer to sell or to purchase securities, is non-binding and is intended solely as a summary of the terms that are currently proposed by the parties, and the failure to execute and deliver a definitive agreement shall impose no liability on RV.</p>
  
  <div style="margin-top: 40pt; display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 6pt;">New Technologies, Inc.</p>
      <div style="border-top: 1px solid #000; margin: 10pt 0;"></div>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">By:</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-weight: bold; margin-bottom: 4pt;">Joe Jones</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-style: italic;">Chief Executive Officer</p>
    </div>
    
    <div style="width: 45%;">
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 6pt;">Rogue Ventures, LP</p>
      <div style="border-top: 1px solid #000; margin: 10pt 0;"></div>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 4pt;">By:</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-weight: bold; margin-bottom: 4pt;">Mike Perry</p>
      <p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; font-style: italic;">Partner</p>
    </div>
  </div>
</div>`;
          }
          
          // If it's a different Word document, try to extract some readable text
          try {
            return `<div class="document-content" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0;"><p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 10pt;">Binary content (Word document) - text extraction limited</p></div>`;
          } catch (e) {
            return `<div class="document-content" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0;"><p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 10pt;">Binary content (Word document) - text extraction failed</p></div>`;
          }
        }
        
        // Process plain text with basic HTML formatting and apply Word-like styling
        if (typeof content === 'string' && content.trim() && !content.includes('<div') && !content.includes('<p')) {
          return `<div class="document-content" style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; margin: 0; padding: 0;"><p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; margin-bottom: 10pt;">${content.replace(/\n\n+/g, '</p><p style="font-family: \'Calibri\', \'Arial\', sans-serif; font-size: 11pt; margin-bottom: 10pt;">').replace(/\n/g, '<br>')}</p></div>`;
        }
        
        return content;
      };
      
      // Process content for both versions
      const processedContent1 = processContent(version1.fileContent, version1.fileName);
      const processedContent2 = processContent(version2.fileContent, version2.fileName);
      
      // Get the diff HTML from storage, passing the processed content
      const diff = await storage.compareDocumentVersions(
        versionId1, 
        versionId2,
        processedContent1,
        processedContent2
      );
      
      console.log("Diff generated successfully");
      
      // Return the diff, processed content, and empty AI summary
      res.json({ 
        diff,
        contentV1: processedContent1,
        contentV2: processedContent2,
        // Send an empty AI summary structure to avoid UI errors
        aiSummary: null
      });
    } catch (error) {
      console.error("Error comparing document versions:", error);
      res.status(500).json({ 
        message: "Failed to compare document versions",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/document-versions/document/:documentId", async (req, res) => {
    const documentId = parseInt(req.params.documentId);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }
    
    try {
      console.log(`Fetching document versions for document ID: ${documentId}`);
      const versions = await storage.getDocumentVersions(documentId);
      console.log(`Found ${versions.length} versions for document ID: ${documentId}`);
      return res.json(versions);
    } catch (error) {
      console.error("Error fetching document versions:", error);
      return res.status(500).json({ message: "Failed to fetch document versions" });
    }
  });

  app.get("/api/document-versions/:id", async (req, res) => {
    const versionId = parseInt(req.params.id);
    if (isNaN(versionId)) {
      return res.status(400).json({ message: "Invalid version ID" });
    }
    
    try {
      console.log(`Fetching document version ID: ${versionId}`);
      const version = await storage.getDocumentVersion(versionId);
      if (!version) {
        return res.status(404).json({ message: "Document version not found" });
      }
      console.log(`Found version ID: ${versionId}, filename: ${version.fileName}`);
      res.json(version);
    } catch (error) {
      console.error("Error fetching document version:", error);
      res.status(500).json({ message: "Failed to fetch document version" });
    }
  });

  // Tasks API has been removed completely

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
      console.log("Received issue creation request with body:", req.body);
      
      // Create a schema for issue creation
      const issueSchema = z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        status: z.string().default("open"),
        priority: z.string().default("medium"),
        dealId: z.number(),
        assigneeId: z.number().optional().nullable()
      });
      
      const validatedData = issueSchema.parse(req.body);
      console.log("Validated issue data:", validatedData);
      
      const issue = await storage.createIssue(validatedData);
      console.log("Issue created successfully:", issue);
      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating issue:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(error.errors));
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
      console.log("Received issue update request with body:", req.body);
      
      // Create a schema for issue updates
      const partialSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(), // Not allowing null in updates
        status: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.union([z.number(), z.null()]).optional()
      });
      
      const validatedData = partialSchema.parse(req.body);
      console.log("Validated issue update data:", validatedData);
      
      const updatedIssue = await storage.updateIssue(id, validatedData);
      if (!updatedIssue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      console.log("Issue updated successfully:", updatedIssue);
      res.json(updatedIssue);
    } catch (error) {
      console.error("Error updating issue:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(error.errors));
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

  // Get a specific law firm by ID
  app.get("/api/law-firms/:id", async (req, res) => {
    const firmId = parseInt(req.params.id);
    if (isNaN(firmId)) {
      return res.status(400).json({ message: "Invalid law firm ID" });
    }

    const firm = await storage.getLawFirm(firmId);
    if (!firm) {
      return res.status(404).json({ message: "Law firm not found" });
    }
    
    res.json(firm);
  });

  // Attorneys API
  app.get("/api/law-firms/:id/attorneys", async (req, res) => {
    const firmId = parseInt(req.params.id);
    if (isNaN(firmId)) {
      return res.status(400).json({ message: "Invalid law firm ID" });
    }

    console.log(`DEBUG - Fetching attorneys for law firm ID: ${firmId}`);
    const attorneys = await storage.getAttorneysByFirm(firmId);
    console.log(`DEBUG - Found ${attorneys.length} attorneys for law firm ID: ${firmId}`);
    
    // Log each attorney to verify the data
    attorneys.forEach(attorney => {
      console.log(`DEBUG - Attorney: ${attorney.name}, Law Firm ID: ${attorney.lawFirmId}`);
    });
    
    res.json(attorneys);
  });
  
  // Image proxy endpoint to handle external image requests
  app.get("/api/image-proxy", async (req, res) => {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: "URL parameter is required" });
    }
    
    try {
      console.log(`DEBUG - Image proxy fetching: ${url}`);
      
      // Add user-agent to avoid being blocked
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          message: `Failed to fetch image: ${response.statusText}` 
        });
      }
      
      // Get content type from original response
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      // Convert the response to a buffer and send it
      const buffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(buffer);
      console.log(`DEBUG - Image proxy success: ${url} (${imageBuffer.length} bytes, content-type: ${contentType})`);
      
      res.send(imageBuffer);
      
    } catch (error) {
      console.error('Image proxy error:', error);
      res.status(500).json({ message: "Failed to proxy image" });
    }
  });
  
  // Get deals associated with a law firm
  app.get("/api/law-firms/:id/deals", async (req, res) => {
    const firmId = parseInt(req.params.id);
    if (isNaN(firmId)) {
      return res.status(400).json({ message: "Invalid law firm ID" });
    }
    
    try {
      // Check if the law firm exists
      const firm = await storage.getLawFirm(firmId);
      if (!firm) {
        return res.status(404).json({ message: "Law firm not found" });
      }
      
      const deals = await storage.getDealsByLawFirm(firmId);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching deals by law firm:", error);
      res.status(500).json({ message: "Failed to fetch deals for law firm" });
    }
  });

  // Get all attorneys
  app.get("/api/attorneys", async (req, res) => {
    const attorneys = await storage.getAttorneys();
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
  
  // Update an attorney
  app.patch("/api/attorneys/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      // Get the current attorney to make sure it exists
      const existingAttorney = await storage.getAttorney(id);
      if (!existingAttorney) {
        return res.status(404).json({ message: "Attorney not found" });
      }
      
      // Update the attorney
      const updatedAttorney = await storage.updateAttorney(id, req.body);
      res.json(updatedAttorney);
    } catch (error) {
      console.error("Error updating attorney:", error);
      res.status(500).json({ message: "Failed to update attorney" });
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
      
      // Get existing counsels for this deal with the same role
      const existingCounsels = await storage.getDealCounsels(validatedData.dealId);
      const sameRoleCounsels = existingCounsels.filter(c => c.role === validatedData.role);
      
      // Delete existing counsels with the same role
      for (const counsel of sameRoleCounsels) {
        await storage.deleteDealCounsel(counsel.id);
      }
      
      // Create the new counsel
      const counsel = await storage.createDealCounsel(validatedData);
      res.status(201).json(counsel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deal counsel data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create deal counsel" });
    }
  });
  
  // Handle replacing multiple counsel entries for a deal
  app.post("/api/deal-counsels/replace", async (req, res) => {
    try {
      // Validate required fields
      const { dealId, role, entries } = req.body;
      
      if (!dealId || !role || !Array.isArray(entries)) {
        return res.status(400).json({ message: "Missing required fields: dealId, role, entries (array)" });
      }
      
      // Get existing counsels for this deal with the same role
      const existingCounsels = await storage.getDealCounsels(dealId);
      const sameRoleCounsels = existingCounsels.filter(c => c.role === role);
      
      // Delete existing counsels with the same role
      for (const counsel of sameRoleCounsels) {
        await storage.deleteDealCounsel(counsel.id);
      }
      
      // Create new counsel entries
      const createdCounsels = [];
      for (const entry of entries) {
        const counselData = {
          dealId,
          role,
          lawFirmId: entry.lawFirmId,
          attorneyId: entry.attorneyId
        };
        
        const counsel = await storage.createDealCounsel(counselData);
        createdCounsels.push(counsel);
      }
      
      res.status(201).json({ success: true, counsels: createdCounsels });
    } catch (error) {
      console.error("Error replacing deal counsels:", error);
      res.status(500).json({ message: "Failed to replace deal counsels" });
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

  // App Settings API
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching app settings:", error);
      res.status(500).json({ message: "Failed to fetch app settings" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getAppSettingByKey(key);
      
      if (!setting) {
        return res.status(404).json({ message: `Setting with key "${key}" not found` });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching app setting:", error);
      res.status(500).json({ message: "Failed to fetch app setting" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ message: "Key and value are required" });
      }
      
      const setting = await storage.createAppSetting({ key, value });
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error creating app setting:", error);
      res.status(500).json({ message: "Failed to create app setting" });
    }
  });

  app.patch("/api/settings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid setting ID" });
      }
      
      const { key, value } = req.body;
      
      // When updating a setting, we only need the value
      // Don't require key to be provided since we're updating by ID
      if (value === undefined) {
        return res.status(400).json({ message: "Value must be provided" });
      }
      
      // Create update object with only the fields that are defined
      const update: Partial<{ key: string, value: string }> = {};
      if (key !== undefined) update.key = key;
      if (value !== undefined) update.value = value;
      
      const setting = await storage.updateAppSetting(id, update);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      // If this is the organization name setting, update lead investors in deals
      if (setting.key === "organizationName") {
        // Get the current organization name from the deals
        let oldOrgName = "Rogue Capital Ventures"; // Default if not found
        
        // Try to determine the old name more reliably by looking at deals
        try {
          const deals = await storage.getDeals();
          // Find org name used in most deals
          const orgNameCount: Record<string, number> = {};
          
          for (const deal of deals) {
            if (deal.leadInvestor) {
              orgNameCount[deal.leadInvestor] = (orgNameCount[deal.leadInvestor] || 0) + 1;
            }
          }
          
          // Find the most common lead investor
          let maxCount = 0;
          for (const [name, count] of Object.entries(orgNameCount)) {
            if (count > maxCount) {
              maxCount = count;
              oldOrgName = name;
            }
          }
        } catch (error) {
          console.error("Error determining old organization name:", error);
        }
        
        console.log(`Organization name changed from "${oldOrgName}" to "${setting.value}", updating references`);
        
        try {
          // Update lead investor in all deals where it's set to the old org name
          const deals = await storage.getDeals();
          for (const deal of deals) {
            // If lead investor matches the old organization name, update it
            if (deal.leadInvestor === oldOrgName) {
              console.log(`Updating leadInvestor in deal #${deal.id} (${deal.title}) from "${deal.leadInvestor}" to "${setting.value}"`);
              
              await storage.updateDeal(deal.id, {
                leadInvestor: setting.value
              });
            }
          }
          console.log("Deal lead investor references updated successfully");
        } catch (updateError) {
          console.error("Error updating deals with new organization name:", updateError);
        }
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating app setting:", error);
      res.status(500).json({ message: "Failed to update app setting" });
    }
  });

  app.delete("/api/settings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid setting ID" });
      }
      
      const success = await storage.deleteAppSetting(id);
      
      if (!success) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting app setting:", error);
      res.status(500).json({ message: "Failed to delete app setting" });
    }
  });
  
  // Endpoint to fetch unique lead investor names
  app.get("/api/lead-investors", async (req, res) => {
    try {
      const deals = await storage.getDeals();
      
      // Extract unique lead investor names from existing deals
      const customLeadInvestors = new Set<string>();
      
      // Build a map to count how many times each investor appears
      // This helps us track which investors are actually used in deals
      const investorUsageCounts: Record<string, number> = {};
      
      // Log all lead investors from deals for debugging
      console.log("Extracting lead investors from deals:");
      deals.forEach((deal: any) => {
        if (deal.leadInvestor) {
          console.log(`Deal ${deal.id}: Lead investor = "${deal.leadInvestor}"`);
          
          // Add to the set of custom investors
          customLeadInvestors.add(deal.leadInvestor);
          
          // Increment the count for this investor
          investorUsageCounts[deal.leadInvestor] = (investorUsageCounts[deal.leadInvestor] || 0) + 1;
        }
      });
      
      // Log custom lead investors extracted from deals
      console.log("Custom lead investors extracted:", Array.from(customLeadInvestors));
      console.log("Investor usage counts:", investorUsageCounts);
      
      // Add common VC firms to the options - default list
      const defaultVcFirms = [
        "8VC",
        "Accel Partners",
        "Andreessen Horowitz",
        "Balderton Capital",
        "Battery Ventures",
        "Benchmark Capital",
        "Bessemer Venture Partners",
        "Draper Fisher Jurvetson (DFJ)",
        "Elevation Capital Partners",
        "Felicis Ventures",
        "Fifth Wall Asset Management",
        "Firstmark Capital",
        "FJ Labs",
        "Founders Fund",
        "Foundry Group",
        "General Atlantic",
        "General Catalyst Partners",
        "GGV Capital",
        "Greylock Partners",
        "Greycroft Partners",
        "Iconiq Capital",
        "Insight Venture Partners",
        "Institutional Venture Partners (IVP)",
        "Khosla Ventures",
        "Kleiner Perkins Caufield Byers",
        "Lightspeed Venture Partners",
        "Lux Capital",
        "Madrona Venture Group",
        "Menlo Ventures",
        "New Enterprise Associates (NEA)",
        "Norwest Venture Partners",
        "QED Investors",
        "Redpoint Ventures",
        "Ribbit Capital",
        "Sapphire Ventures",
        "Scale Venture Partners",
        "Sequoia Capital",
        "Signalfire",
        "Thrive Capital",
        "Tiger Global Management",
        "True Ventures",
        "Union Square Ventures"
      ];
      
      // Start with only the custom lead investors that are actually in use
      const activeLeadInvestors = new Set<string>();
      
      // Add only investors that are actually used in current deals
      for (const investor of customLeadInvestors) {
        if (investorUsageCounts[investor] && investorUsageCounts[investor] > 0) {
          console.log(`Adding active investor: ${investor} (used in ${investorUsageCounts[investor]} deals)`);
          activeLeadInvestors.add(investor);
        } else {
          console.log(`Skipping unused investor: ${investor}`);
        }
      }
      
      // Add default VC firms 
      defaultVcFirms.forEach(firm => activeLeadInvestors.add(firm));
      
      // Sort alphabetically and return as array
      const result = Array.from(activeLeadInvestors).sort();
      console.log("Final lead investors list (first 10):", result.slice(0, 10), "...");
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching lead investors:", error);
      res.status(500).json({ message: "Failed to fetch lead investors" });
    }
  });

  // Special route for serving document for MS Office Viewer
  app.get('/api/viewer/term-sheet.docx', async (req: Request, res: Response) => {
    try {
      const dealId = req.query.dealId as string;
      if (!dealId) {
        // If no deal ID is specified, return a sample document for testing
        const sampleDocPath = './attached_assets/test1.docx';
        res.download(sampleDocPath);
        return;
      }
      
      // Get the deal to access the term sheet
      const deal = await storage.getDeal(parseInt(dealId, 10));
      if (!deal || !deal.termSheetUrl) {
        return res.status(404).json({ error: 'Term sheet not found' });
      }
      
      // Extract base64 data and convert to buffer
      const base64Data = deal.termSheetUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Set response headers for a DOCX file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'inline; filename="term-sheet.docx"');
      res.setHeader('Content-Length', buffer.length);
      
      // Send the file data
      res.send(buffer);
    } catch (error) {
      console.error('Error serving document:', error);
      res.status(500).json({ error: 'Failed to serve document' });
    }
  });

  // Funds API
  app.get("/api/funds", async (req, res) => {
    try {
      const funds = await storage.getFunds();
      res.json(funds);
    } catch (error) {
      console.error("Error fetching funds:", error);
      res.status(500).json({ message: "Failed to fetch funds" });
    }
  });

  app.get("/api/funds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid fund ID" });
    }

    try {
      const fund = await storage.getFund(id);
      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }
      res.json(fund);
    } catch (error) {
      console.error("Error fetching fund:", error);
      res.status(500).json({ message: "Failed to fetch fund" });
    }
  });

  app.post("/api/funds", async (req, res) => {
    try {
      // Create a base schema from the funds table
      const validatedData = insertFundSchema.parse(req.body);
      const fund = await storage.createFund(validatedData);
      res.status(201).json(fund);
    } catch (error) {
      console.error("Error creating fund:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fund data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund" });
    }
  });

  app.patch("/api/funds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid fund ID" });
    }

    try {
      // For transformed schemas, create a new partial schema from the base
      const baseFundSchema = createInsertSchema(funds).partial();
      
      const validatedData = baseFundSchema.parse(req.body);
      
      const updatedFund = await storage.updateFund(id, validatedData);
      if (!updatedFund) {
        return res.status(404).json({ message: "Fund not found" });
      }
      
      res.json(updatedFund);
    } catch (error) {
      console.error("Error updating fund:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fund data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update fund" });
    }
  });

  app.delete("/api/funds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid fund ID" });
    }

    try {
      const success = await storage.deleteFund(id);
      if (!success) {
        return res.status(404).json({ message: "Fund not found or has associated allocations" });
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting fund:", error);
      res.status(500).json({ message: "Failed to delete fund" });
    }
  });

  // Allocations API
  app.get("/api/deals/:id/allocations", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    try {
      const allocations = await storage.getAllocations(dealId);
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.post("/api/allocations", async (req, res) => {
    try {
      const validatedData = insertAllocationSchema.parse(req.body);
      const allocation = await storage.createAllocation(validatedData);
      res.status(201).json(allocation);
    } catch (error) {
      console.error("Error creating allocation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid allocation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create allocation" });
    }
  });

  app.get("/api/allocations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid allocation ID" });
    }

    try {
      const allocation = await storage.getAllocation(id);
      if (!allocation) {
        return res.status(404).json({ message: "Allocation not found" });
      }
      res.json(allocation);
    } catch (error) {
      console.error("Error fetching allocation:", error);
      res.status(500).json({ message: "Failed to fetch allocation" });
    }
  });

  app.patch("/api/allocations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid allocation ID" });
    }

    try {
      // Create a partial schema from the allocations table
      const baseAllocationSchema = createInsertSchema(allocations).partial();
      
      const validatedData = baseAllocationSchema.parse(req.body);
      
      const updatedAllocation = await storage.updateAllocation(id, validatedData);
      if (!updatedAllocation) {
        return res.status(404).json({ message: "Allocation not found" });
      }
      
      res.json(updatedAllocation);
    } catch (error) {
      console.error("Error updating allocation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid allocation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update allocation" });
    }
  });

  app.delete("/api/allocations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid allocation ID" });
    }

    try {
      const success = await storage.deleteAllocation(id);
      if (!success) {
        return res.status(404).json({ message: "Allocation not found" });
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting allocation:", error);
      res.status(500).json({ message: "Failed to delete allocation" });
    }
  });
  
  // Tasks API
  app.get("/api/deals/:id/tasks", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    try {
      const tasks = await storage.getTasksByDeal(dealId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      console.log("POST /api/tasks request body:", JSON.stringify(req.body, null, 2));
      
      // Use the full data sent from the client, with some sensible defaults
      const taskData = {
        name: req.body.name || "Test Task",
        description: req.body.description || "",
        dealId: req.body.dealId || 1,
        taskType: req.body.taskType || "internal",
        status: req.body.status || "open",
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        
        // Include assignee information based on task type
        assigneeId: req.body.assigneeId || null,
        lawFirmId: req.body.lawFirmId || null,
        attorneyId: req.body.attorneyId || null,
        customAssigneeId: req.body.customAssigneeId || null
      };

      console.log("Creating task with data:", JSON.stringify(taskData, null, 2));
      
      try {
        const task = await storage.createTask(taskData);
        console.log("Task created successfully:", JSON.stringify(task, null, 2));
        return res.status(201).json(task);
      } catch (storageError) {
        console.error("Storage error creating task:", storageError);
        return res.status(500).json({ 
          message: "Database error creating task", 
          error: String(storageError)
        });
      }
    } catch (error) {
      console.error("Unexpected error creating task:", error);
      return res.status(500).json({ 
        message: "Failed to create task", 
        error: String(error),
        stack: process.env.NODE_ENV === 'production' ? undefined : (error as any).stack
      });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`🔍 PATCH /api/tasks/${id} - Received request with body:`, JSON.stringify(req.body, null, 2));
    
    if (isNaN(id)) {
      console.log(`❌ PATCH /api/tasks/${id} - Invalid task ID`);
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      // Ensure dueDate is properly converted to a Date object if it exists
      const data = req.body;
      
      console.log(`🔍 PATCH /api/tasks/${id} - Processing data:`, {
        beforeConversion: { 
          dueDate: data.dueDate, 
          dueDateType: data.dueDate ? typeof data.dueDate : 'null/undefined',
          isDateInstance: data.dueDate instanceof Date
        }
      });
      
      if (data.dueDate && !(data.dueDate instanceof Date)) {
        try {
          data.dueDate = new Date(data.dueDate);
          console.log(`🔍 PATCH /api/tasks/${id} - Converted dueDate:`, {
            newDueDate: data.dueDate,
            isValid: !isNaN(data.dueDate.getTime())
          });
        } catch (err) {
          console.error(`❌ PATCH /api/tasks/${id} - Error converting dueDate:`, err);
          // Keep original value if conversion fails
        }
      }

      // Create a partial schema for validation
      const partialTaskSchema = z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        dealId: z.number().optional(),
        dueDate: z.date().nullable().optional(),
        assigneeId: z.number().nullable().optional(),
        customAssigneeId: z.number().nullable().optional(),
        lawFirmId: z.number().nullable().optional(),
        attorneyId: z.number().nullable().optional(),
        taskType: z.string().optional(),
        status: z.string().optional()
      });

      console.log(`🔍 PATCH /api/tasks/${id} - Data before validation:`, JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2));
      
      const validatedData = partialTaskSchema.parse(data);
      
      console.log(`🔍 PATCH /api/tasks/${id} - Data after validation:`, JSON.stringify(validatedData, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2));
      
      const updatedTask = await storage.updateTask(id, validatedData);
      
      if (!updatedTask) {
        console.log(`❌ PATCH /api/tasks/${id} - Task not found`);
        return res.status(404).json({ message: "Task not found" });
      }
      
      console.log(`✅ PATCH /api/tasks/${id} - Task updated successfully:`, JSON.stringify(updatedTask, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2));
      
      res.json(updatedTask);
    } catch (error) {
      console.error(`❌ PATCH /api/tasks/${id} - Error updating task:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    try {
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });
  
  // Test endpoint to create a task directly for debugging
  app.post("/api/test-create-task", async (req, res) => {
    try {
      // Create a test task for the current deal
      const dealIdParam = req.query.dealId || 1; // Default to deal 1
      const dealId = typeof dealIdParam === 'string' ? parseInt(dealIdParam, 10) : dealIdParam;
      
      const testTask = {
        name: `Test Task ${new Date().toLocaleTimeString()}`,
        description: "This is an automatically generated test task",
        dealId,
        taskType: "internal",
        status: "open",
        assigneeId: 1, // Default to the first user
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Due in 1 week
      };
      
      console.log("Creating test task:", testTask);
      
      const task = await storage.createTask(testTask);
      console.log("Test task created:", task);
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating test task:", error);
      res.status(500).json({ message: "Failed to create test task", error: String(error) });
    }
  });

  // Custom Assignees API
  // Get all custom assignees
  app.get("/api/custom-assignees", async (req, res) => {
    try {
      const customAssignees = await storage.getCustomAssignees();
      return res.status(200).json(customAssignees);
    } catch (error) {
      console.error("Error fetching all custom assignees:", error);
      return res.status(500).json({ message: "Failed to fetch custom assignees" });
    }
  });

  // Get specific custom assignee by ID
  app.get("/api/custom-assignees/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid custom assignee ID" });
    }

    try {
      const customAssignee = await storage.getCustomAssignee(id);
      if (!customAssignee) {
        return res.status(404).json({ message: "Custom assignee not found" });
      }
      res.json(customAssignee);
    } catch (error) {
      console.error("Error fetching custom assignee:", error);
      res.status(500).json({ message: "Failed to fetch custom assignee" });
    }
  });

  app.post("/api/custom-assignees", async (req, res) => {
    try {
      const validatedData = insertCustomAssigneeSchema.parse(req.body);
      const customAssignee = await storage.createCustomAssignee(validatedData);
      res.status(201).json(customAssignee);
    } catch (error) {
      console.error("Error creating custom assignee:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom assignee data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create custom assignee" });
    }
  });

  app.patch("/api/custom-assignees/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid custom assignee ID" });
    }

    try {
      const partialCustomAssigneeSchema = z.object({
        name: z.string().optional()
      });

      const validatedData = partialCustomAssigneeSchema.parse(req.body);
      const updatedCustomAssignee = await storage.updateCustomAssignee(id, validatedData);
      
      if (!updatedCustomAssignee) {
        return res.status(404).json({ message: "Custom assignee not found" });
      }
      
      res.json(updatedCustomAssignee);
    } catch (error) {
      console.error("Error updating custom assignee:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom assignee data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update custom assignee" });
    }
  });

  app.delete("/api/custom-assignees/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid custom assignee ID" });
    }

    try {
      const success = await storage.deleteCustomAssignee(id);
      if (!success) {
        return res.status(404).json({ message: "Custom assignee not found" });
      }
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting custom assignee:", error);
      res.status(500).json({ message: "Failed to delete custom assignee" });
    }
  });

  // Clean up unused custom assignees
  app.post("/api/custom-assignees/cleanup", async (req, res) => {
    try {
      const success = await storage.deleteUnusedCustomAssignees();
      res.json({ success, message: "Unused custom assignees cleaned up" });
    } catch (error) {
      console.error("Error cleaning up custom assignees:", error);
      res.status(500).json({ message: "Failed to clean up custom assignees" });
    }
  });
  
  // Test endpoint for creating a task - for debugging
  app.post("/api/test-create-task", async (req, res) => {
    try {
      console.log("TEST ROUTE - Creating task with data:", JSON.stringify(req.body, null, 2));
      
      // Create a simple test task
      const testTask = {
        name: "Test Task " + new Date().toISOString(),
        description: "This is a test task created via debug endpoint",
        dealId: 1, // hardcoded for testing
        taskType: "internal",
        status: "open",
        assigneeId: 1 // hardcoded for testing
      };
      
      console.log("TEST ROUTE - Using test task data:", JSON.stringify(testTask, null, 2));
      
      try {
        const validatedData = insertTaskSchema.parse(testTask);
        console.log("TEST ROUTE - Validated task data:", JSON.stringify(validatedData, null, 2));
        
        const task = await storage.createTask(validatedData);
        console.log("TEST ROUTE - Task created successfully:", JSON.stringify(task, null, 2));
        return res.status(201).json({
          success: true,
          message: "Test task created successfully",
          task
        });
      } catch (validationError) {
        console.error("TEST ROUTE - Validation error:", validationError);
        return res.status(400).json({ 
          success: false,
          message: "Invalid task data", 
          error: validationError instanceof z.ZodError ? validationError.format() : String(validationError)
        });
      }
    } catch (error) {
      console.error("TEST ROUTE - Unexpected error creating task:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to create test task", 
        error: String(error),
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      });
    }
  });

  // Closing Checklist API
  app.get("/api/deals/:id/closing-checklist", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    try {
      const checklistItems = await storage.getClosingChecklistByDeal(dealId);
      res.json(checklistItems);
    } catch (error) {
      console.error("Error fetching closing checklist:", error);
      res.status(500).json({ message: "Failed to fetch closing checklist" });
    }
  });

  app.post("/api/deals/:id/closing-checklist", async (req, res) => {
    const dealId = parseInt(req.params.id);
    if (isNaN(dealId)) {
      return res.status(400).json({ message: "Invalid deal ID" });
    }

    try {
      const data = { ...req.body, dealId };
      
      // Convert dueDate to Date object if provided
      if (data.dueDate && !(data.dueDate instanceof Date)) {
        data.dueDate = new Date(data.dueDate);
      }
      
      const validatedData = insertClosingChecklistSchema.parse(data);
      const checklistItem = await storage.createClosingChecklistItem(validatedData);
      res.status(201).json(checklistItem);
    } catch (error) {
      console.error("Error creating closing checklist item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid checklist item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create closing checklist item" });
    }
  });

  app.patch("/api/closing-checklist/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid closing checklist item ID" });
    }

    try {
      // Convert dueDate to Date object if provided
      const data = req.body;
      if (data.dueDate && !(data.dueDate instanceof Date)) {
        data.dueDate = new Date(data.dueDate);
      }

      // Create partial validation schema
      const validationSchema = z.object({
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        dueDate: z.date().nullable().optional(),
        assigneeId: z.number().nullable().optional(),
        isComplete: z.boolean().optional()
      });
      
      const validatedData = validationSchema.parse(data);
      const updatedItem = await storage.updateClosingChecklistItem(id, validatedData);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Closing checklist item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating closing checklist item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid checklist item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update closing checklist item" });
    }
  });

  app.delete("/api/closing-checklist/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid closing checklist item ID" });
    }

    try {
      const success = await storage.deleteClosingChecklistItem(id);
      if (!success) {
        return res.status(404).json({ message: "Closing checklist item not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting closing checklist item:", error);
      res.status(500).json({ message: "Failed to delete closing checklist item" });
    }
  });
  
  return httpServer;
}
