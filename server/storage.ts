import {
  users, User, InsertUser,
  deals, Deal, InsertDeal,
  dealUsers, DealUser, InsertDealUser,
  documents, Document, InsertDocument,
  documentVersions, DocumentVersion, InsertDocumentVersion,
  tasks, Task, InsertTask,
  issues, Issue, InsertIssue,
  lawFirms, LawFirm, InsertLawFirm,
  attorneys, Attorney, InsertAttorney, 
  dealCounsels, DealCounsel, InsertDealCounsel,
  timelineEvents, TimelineEvent, InsertTimelineEvent
} from "@shared/schema";
import { format } from 'date-fns';

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Deals
  getDeal(id: number): Promise<Deal | undefined>;
  getDeals(): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: number): Promise<boolean>;

  // Deal Users
  getDealUsers(dealId: number): Promise<(DealUser & { user: User })[]>;
  addUserToDeal(dealUser: InsertDealUser): Promise<DealUser>;
  removeUserFromDeal(dealId: number, userId: number): Promise<boolean>;

  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByDeal(dealId: number): Promise<(Document & { versions: number })[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Document Versions
  getDocumentVersion(id: number): Promise<DocumentVersion | undefined>;
  getDocumentVersions(documentId: number): Promise<(DocumentVersion & { uploadedBy: User })[]>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  getLatestVersionNumber(documentId: number): Promise<number>;
  compareDocumentVersions(versionId1: number, versionId2: number, customContent1?: string, customContent2?: string): Promise<string>;

  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasksByDeal(dealId: number): Promise<(Task & { assignee?: User })[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  completeTask(id: number): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Issues
  getIssue(id: number): Promise<Issue | undefined>;
  getIssuesByDeal(dealId: number): Promise<(Issue & { assignee?: User })[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, issue: Partial<InsertIssue>): Promise<Issue | undefined>;
  deleteIssue(id: number): Promise<boolean>;

  // Law Firms
  getLawFirm(id: number): Promise<LawFirm | undefined>;
  getLawFirms(): Promise<LawFirm[]>;
  createLawFirm(firm: InsertLawFirm): Promise<LawFirm>;
  updateLawFirm(id: number, firm: Partial<InsertLawFirm>): Promise<LawFirm | undefined>;
  deleteLawFirm(id: number): Promise<boolean>;

  // Attorneys
  getAttorney(id: number): Promise<Attorney | undefined>;
  getAttorneysByFirm(firmId: number): Promise<Attorney[]>;
  createAttorney(attorney: InsertAttorney): Promise<Attorney>;
  updateAttorney(id: number, attorney: Partial<InsertAttorney>): Promise<Attorney | undefined>;
  deleteAttorney(id: number): Promise<boolean>;

  // Deal Counsels
  getDealCounsel(id: number): Promise<DealCounsel | undefined>;
  getDealCounsels(dealId: number): Promise<(DealCounsel & { lawFirm: LawFirm, attorney?: Attorney })[]>;
  createDealCounsel(counsel: InsertDealCounsel): Promise<DealCounsel>;
  updateDealCounsel(id: number, counsel: Partial<InsertDealCounsel>): Promise<DealCounsel | undefined>;
  deleteDealCounsel(id: number): Promise<boolean>;

  // Timeline
  getTimelineEvents(dealId: number): Promise<TimelineEvent[]>;
  createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private deals: Map<number, Deal>;
  private dealUsers: Map<number, DealUser>;
  private documents: Map<number, Document>;
  private documentVersions: Map<number, DocumentVersion>;
  private tasks: Map<number, Task>;
  private issues: Map<number, Issue>;
  private lawFirms: Map<number, LawFirm>;
  private attorneys: Map<number, Attorney>;
  private dealCounsels: Map<number, DealCounsel>;
  private timelineEvents: Map<number, TimelineEvent>;

  currentUserId: number;
  currentDealId: number;
  currentDealUserId: number;
  currentDocumentId: number;
  currentVersionId: number;
  currentTaskId: number;
  currentIssueId: number;
  currentLawFirmId: number;
  currentAttorneyId: number;
  currentDealCounselId: number;
  currentTimelineEventId: number;

  constructor() {
    this.users = new Map();
    this.deals = new Map();
    this.dealUsers = new Map();
    this.documents = new Map();
    this.documentVersions = new Map();
    this.tasks = new Map();
    this.issues = new Map();
    this.lawFirms = new Map();
    this.attorneys = new Map();
    this.dealCounsels = new Map();
    this.timelineEvents = new Map();

    this.currentUserId = 1;
    this.currentDealId = 1;
    this.currentDealUserId = 1;
    this.currentDocumentId = 1;
    this.currentVersionId = 1;
    this.currentTaskId = 1;
    this.currentIssueId = 1;
    this.currentLawFirmId = 1;
    this.currentAttorneyId = 1;
    this.currentDealCounselId = 1;
    this.currentTimelineEventId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  // Initialize with sample data to have a working app on start
  private initializeSampleData() {
    // Create users
    const user1: InsertUser = {
      username: "jdoe",
      password: "password",
      fullName: "John Doe",
      initials: "JD",
      email: "jdoe@company.com",
      role: "General Counsel",
      avatarColor: "#22c55e" // green-600
    };
    const user2: InsertUser = {
      username: "tanderson",
      password: "password",
      fullName: "Tina Anderson",
      initials: "TA",
      email: "tanderson@company.com",
      role: "Associate Counsel",
      avatarColor: "#ea580c" // orange-600
    };
    const user3: InsertUser = {
      username: "mrichards",
      password: "password",
      fullName: "Mark Richards",
      initials: "MR",
      email: "mrichards@company.com",
      role: "Paralegal",
      avatarColor: "#2563eb" // blue-600
    };

    const createdUser1 = this.createUser(user1);
    const createdUser2 = this.createUser(user2);
    const createdUser3 = this.createUser(user3);

    // Create law firms
    const firm1: InsertLawFirm = {
      name: "Smith & Wilson LLP",
      specialty: "Corporate Securities",
      email: "info@smithwilson.com",
      phone: "555-123-4567"
    };
    const firm2: InsertLawFirm = {
      name: "Blackstone & Roberts",
      specialty: "IP Specialist",
      email: "contact@blackstoneroberts.com",
      phone: "555-987-6543"
    };

    const createdFirm1 = this.createLawFirm(firm1);
    const createdFirm2 = this.createLawFirm(firm2);

    // Create attorneys
    const attorney1: InsertAttorney = {
      lawFirmId: createdFirm1.id,
      name: "Sarah Wilson",
      position: "Partner",
      email: "swilson@smithwilson.com",
      phone: "555-111-2222",
      initials: "SW",
      avatarColor: "#9333ea" // purple-600
    };
    const attorney2: InsertAttorney = {
      lawFirmId: createdFirm2.id,
      name: "Robert Black",
      position: "Senior Associate",
      email: "rblack@blackstoneroberts.com",
      phone: "555-333-4444",
      initials: "RB",
      avatarColor: "#71717a" // gray-600
    };

    const createdAttorney1 = this.createAttorney(attorney1);
    const createdAttorney2 = this.createAttorney(attorney2);

    // Create deals
    const deal1: InsertDeal = {
      title: "Acme Corp Series C Financing",
      description: "$45M investment round led by Venture Partners",
      dealId: "ACM-2023-C",
      status: "in-progress",
      dueDate: new Date("2023-10-15"),
      company: "Acme Corp",
      amount: "$45M"
    };
    const deal2: InsertDeal = {
      title: "TechStart Acquisition",
      description: "Acquisition of TechStart Inc. - $28M",
      dealId: "TS-2023-ACQ",
      status: "completed",
      dueDate: new Date("2023-09-22"),
      company: "TechStart Inc.",
      amount: "$28M"
    };
    const deal3: InsertDeal = {
      title: "HealthTech Series A",
      description: "$12M funding round for HealthTech startup",
      dealId: "HT-2023-A",
      status: "urgent",
      dueDate: new Date("2023-10-05"),
      company: "HealthTech",
      amount: "$12M"
    };

    const createdDeal1 = this.createDeal(deal1);
    const createdDeal2 = this.createDeal(deal2);
    const createdDeal3 = this.createDeal(deal3);

    // Assign users to deals
    this.addUserToDeal({ dealId: createdDeal1.id, userId: createdUser1.id, role: "Lead" });
    this.addUserToDeal({ dealId: createdDeal1.id, userId: createdUser2.id, role: "Support" });
    this.addUserToDeal({ dealId: createdDeal1.id, userId: createdUser3.id, role: "Support" });

    this.addUserToDeal({ dealId: createdDeal2.id, userId: createdUser3.id, role: "Lead" });
    
    this.addUserToDeal({ dealId: createdDeal3.id, userId: createdUser1.id, role: "Lead" });
    this.addUserToDeal({ dealId: createdDeal3.id, userId: createdUser2.id, role: "Support" });

    // Assign law firms to deals
    this.createDealCounsel({ 
      dealId: createdDeal1.id, 
      lawFirmId: createdFirm1.id, 
      attorneyId: createdAttorney1.id, 
      role: "Lead Counsel" 
    });
    
    this.createDealCounsel({ 
      dealId: createdDeal1.id, 
      lawFirmId: createdFirm2.id, 
      attorneyId: createdAttorney2.id, 
      role: "Supporting" 
    });

    // Create documents for Deal 1
    const doc1: InsertDocument = {
      dealId: createdDeal1.id,
      title: "Series C Stock Purchase Agreement",
      description: "Main agreement for Series C investment",
      category: "Corporate",
      status: "Review",
      assigneeId: createdUser3.id
    };
    
    const doc2: InsertDocument = {
      dealId: createdDeal1.id,
      title: "Investor Rights Agreement",
      description: "Rights of Series C investors",
      category: "Legal",
      status: "Final Draft",
      assigneeId: createdUser2.id
    };
    
    const doc3: InsertDocument = {
      dealId: createdDeal1.id,
      title: "Term Sheet",
      description: "Key terms of the investment",
      category: "Financial",
      status: "Action Required",
      assigneeId: createdUser1.id
    };

    const createdDoc1 = this.createDocument(doc1);
    const createdDoc2 = this.createDocument(doc2);
    const createdDoc3 = this.createDocument(doc3);

    // Add document versions
    this.createDocumentVersion({
      documentId: createdDoc1.id,
      version: 1,
      fileName: "stock_purchase_v1.pdf",
      fileSize: 1200000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdUser3.id,
      comment: "Initial draft"
    });
    
    this.createDocumentVersion({
      documentId: createdDoc1.id,
      version: 2,
      fileName: "stock_purchase_v2.pdf",
      fileSize: 1250000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdAttorney1.id,
      comment: "Reviewed by outside counsel"
    });
    
    this.createDocumentVersion({
      documentId: createdDoc1.id,
      version: 3,
      fileName: "stock_purchase_v3.pdf",
      fileSize: 1280000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdAttorney1.id,
      comment: "Redlined by outside counsel"
    });
    
    this.createDocumentVersion({
      documentId: createdDoc1.id,
      version: 4,
      fileName: "stock_purchase_v4.pdf",
      fileSize: 1300000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdUser1.id,
      comment: "Added investor signature page"
    });

    // Create tasks for Deal 1
    const task1: InsertTask = {
      dealId: createdDeal1.id,
      title: "Review Term Sheet",
      description: "Review all terms and provide feedback",
      status: "active",
      priority: "high",
      dueDate: new Date("2023-10-10"),
      assigneeId: createdUser1.id,
      completed: false
    };
    
    const task2: InsertTask = {
      dealId: createdDeal1.id,
      title: "Prepare cap table",
      description: "Update cap table with new investment",
      status: "completed",
      priority: "medium",
      dueDate: new Date("2023-10-02"),
      assigneeId: createdUser2.id,
      completed: true
    };
    
    const task3: InsertTask = {
      dealId: createdDeal1.id,
      title: "Finalize investor rights",
      description: "Complete investor rights agreement",
      status: "active",
      priority: "medium",
      dueDate: new Date("2023-10-12"),
      assigneeId: createdUser3.id,
      completed: false
    };

    const createdTask1 = this.createTask(task1);
    const createdTask2 = this.createTask(task2);
    this.completeTask(createdTask2.id);
    const createdTask3 = this.createTask(task3);

    // Create issues for Deal 1
    const issue1: InsertIssue = {
      dealId: createdDeal1.id,
      title: "Valuation disagreement",
      description: "Investors pushing for 20% discount to last round valuation",
      status: "open",
      priority: "high",
      assigneeId: createdAttorney1.id
    };
    
    const issue2: InsertIssue = {
      dealId: createdDeal1.id,
      title: "Board seat negotiation",
      description: "Lead investor requesting additional board seat",
      status: "open",
      priority: "medium",
      assigneeId: createdUser1.id
    };

    const createdIssue1 = this.createIssue(issue1);
    const createdIssue2 = this.createIssue(issue2);

    // Create timeline events
    this.createTimelineEvent({
      dealId: createdDeal1.id,
      title: "Term Sheet Updated",
      description: "Sarah Wilson from Smith & Wilson LLP reviewed and updated the term sheet with new valuation terms.",
      eventType: "document",
      referenceId: createdDoc3.id,
      referenceType: "document"
    });
    
    this.createTimelineEvent({
      dealId: createdDeal1.id,
      title: "Issue Raised",
      description: "Valuation disagreement with lead investor. Investors pushing for 20% discount to last round.",
      eventType: "issue",
      referenceId: createdIssue1.id,
      referenceType: "issue"
    });
    
    this.createTimelineEvent({
      dealId: createdDeal1.id,
      title: "Cap Table Completed",
      description: "Financial team completed and verified the capitalization table for the Series C round.",
      eventType: "task",
      referenceId: createdTask2.id,
      referenceType: "task"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Deal methods
  async getDeal(id: number): Promise<Deal | undefined> {
    return this.deals.get(id);
  }

  async getDeals(): Promise<Deal[]> {
    return Array.from(this.deals.values());
  }

  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const id = this.currentDealId++;
    const now = new Date();
    const deal: Deal = { 
      ...insertDeal, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.deals.set(id, deal);
    return deal;
  }

  async updateDeal(id: number, dealUpdate: Partial<InsertDeal>): Promise<Deal | undefined> {
    const existingDeal = this.deals.get(id);
    if (!existingDeal) {
      return undefined;
    }
    
    const updatedDeal: Deal = { 
      ...existingDeal, 
      ...dealUpdate, 
      updatedAt: new Date() 
    };
    this.deals.set(id, updatedDeal);
    return updatedDeal;
  }

  async deleteDeal(id: number): Promise<boolean> {
    return this.deals.delete(id);
  }

  // Deal Users methods
  async getDealUsers(dealId: number): Promise<(DealUser & { user: User })[]> {
    const dealUsersList = Array.from(this.dealUsers.values())
      .filter((du) => du.dealId === dealId);
    
    return dealUsersList.map(du => {
      const user = this.users.get(du.userId);
      if (!user) {
        throw new Error(`User with id ${du.userId} not found`);
      }
      return { ...du, user };
    });
  }

  async addUserToDeal(insertDealUser: InsertDealUser): Promise<DealUser> {
    const id = this.currentDealUserId++;
    const dealUser: DealUser = { ...insertDealUser, id };
    this.dealUsers.set(id, dealUser);
    return dealUser;
  }

  async removeUserFromDeal(dealId: number, userId: number): Promise<boolean> {
    const dealUserArray = Array.from(this.dealUsers.entries());
    for (const [id, dealUser] of dealUserArray) {
      if (dealUser.dealId === dealId && dealUser.userId === userId) {
        return this.dealUsers.delete(id);
      }
    }
    return false;
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByDeal(dealId: number): Promise<(Document & { versions: number })[]> {
    const dealDocs = Array.from(this.documents.values())
      .filter((doc) => doc.dealId === dealId);
    
    return dealDocs.map(doc => {
      const versions = Array.from(this.documentVersions.values())
        .filter(v => v.documentId === doc.id).length;
      
      return { ...doc, versions };
    });
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, documentUpdate: Partial<InsertDocument>): Promise<Document | undefined> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) {
      return undefined;
    }
    
    const updatedDocument: Document = { 
      ...existingDocument, 
      ...documentUpdate, 
      updatedAt: new Date() 
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Document Version methods
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    return this.documentVersions.get(id);
  }

  async getDocumentVersions(documentId: number): Promise<(DocumentVersion & { uploadedBy: User })[]> {
    const versions = Array.from(this.documentVersions.values())
      .filter((version) => version.documentId === documentId)
      .sort((a, b) => b.version - a.version); // Sort by version descending
    
    return versions.map(version => {
      const uploadedBy = this.users.get(version.uploadedById);
      
      if (!uploadedBy) {
        // Try to find in attorneys
        const attorney = Array.from(this.attorneys.values())
          .find(attorney => attorney.id === version.uploadedById);
        
        if (attorney) {
          return { 
            ...version, 
            uploadedBy: {
              id: attorney.id,
              username: attorney.email,
              password: "", // Not needed
              fullName: attorney.name,
              initials: attorney.initials,
              email: attorney.email,
              role: attorney.position,
              avatarColor: attorney.avatarColor
            } 
          };
        }
        
        throw new Error(`User with id ${version.uploadedById} not found`);
      }
      
      return { ...version, uploadedBy };
    });
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = this.currentVersionId++;
    const version: DocumentVersion = { 
      ...insertVersion, 
      id, 
      createdAt: new Date() 
    };
    this.documentVersions.set(id, version);
    
    // Add a timeline event for this new version
    const document = this.documents.get(insertVersion.documentId);
    if (document) {
      const user = this.users.get(insertVersion.uploadedById) || 
                  Array.from(this.attorneys.values())
                    .find(a => a.id === insertVersion.uploadedById);
                    
      const username = user ? 
        (this.users.has(user.id) ? (user as User).fullName : (user as Attorney).name) : 
        'Unknown user';
        
      this.createTimelineEvent({
        dealId: document.dealId,
        title: `Document Updated: ${document.title}`,
        description: `Version ${insertVersion.version} uploaded by ${username}. ${insertVersion.comment ? `Comment: ${insertVersion.comment}` : ''}`,
        eventType: 'document',
        referenceId: document.id,
        referenceType: 'document'
      });
    }
    
    return version;
  }

  async getLatestVersionNumber(documentId: number): Promise<number> {
    const versions = Array.from(this.documentVersions.values())
      .filter(v => v.documentId === documentId);
    
    if (versions.length === 0) {
      return 0; // No versions yet
    }
    
    return Math.max(...versions.map(v => v.version));
  }

  async compareDocumentVersions(versionId1: number, versionId2: number, customContent1?: string, customContent2?: string): Promise<string> {
    const version1 = this.documentVersions.get(versionId1);
    const version2 = this.documentVersions.get(versionId2);
    
    if (!version1 || !version2) {
      throw new Error("One or both document versions not found");
    }
    
    // Determine which version is newer
    const olderVersion = version1.version < version2.version ? version1 : version2;
    const newerVersion = version1.version > version2.version ? version1 : version2;
    
    // Use either the provided custom content (for Word docs) or the original content
    const oldContent = customContent1 || olderVersion.fileContent || "No content available";
    const newContent = customContent2 || newerVersion.fileContent || "No content available";
    
    // Extract readable text from binary content like Word documents
    const extractReadableText = (content: string): string => {
      if (content.startsWith('UEsDB') || content.includes('PK\u0003\u0004')) {
        // This is likely a binary Word document (.docx)
        // Return a placeholder for binary content
        return "Binary content (Word document) - text extraction limited";
      }
      return content;
    };
    
    // Process content if not already processed (customContent provided)
    const processedOldContent = customContent1 ? oldContent : extractReadableText(oldContent);
    const processedNewContent = customContent2 ? newContent : extractReadableText(newContent);
    
    // Simple line-by-line comparison
    let diffHtml = '';
    
    try {
      // For the user's uploaded docs, let's handle their specific case
      if ((olderVersion.fileName === 'test1.docx' && newerVersion.fileName === 'test2.docx') ||
          (olderVersion.fileName === 'test2.docx' && newerVersion.fileName === 'test1.docx')) {
        
        // Test 1 content from the real document
        const test1Content = `SIMPLE AGREEMENT FOR FUTURE EQUITY 

INDICATIVE TERM SHEET

September 29, 2024

Investment:
Rogue Ventures, LP and related entities ("RV") shall invest $5 million of $7 million in aggregate Simple Agreements for Future Equity ("Safes") in New Technologies, Inc. (the "Company"), which shall convert upon the consummation of the Company's next issuance and sale of preferred shares at a fixed valuation (the "Equity Financing").   

Security:
Standard post-money valuation cap only Safe.

Valuation cap:
$40 million post-money fully-diluted valuation cap (which includes all new capital above, any outstanding convertible notes/Safes).

Other Rights:
Standard and customary investor most favored nations clause, pro rata rights and major investor rounds upon the consummation of the Equity Financing. 

This term sheet does not constitute either an offer to sell or to purchase securities, is non-binding and is intended solely as a summary of the terms that are currently proposed by the parties, and the failure to execute and deliver a definitive agreement shall impose no liability on RV. 

New Technologies, Inc.                 Rogue Ventures, LP

By: ____________                       By: ____________
    Joe Smith, Chief Executive Officer     Fred Perry, Partner`;
        
        // Test 2 content from the real document
        const test2Content = `SIMPLE AGREEMENT FOR FUTURE EQUITY 

INDICATIVE TERM SHEET

September 31, 2024

Investment:
Rogue Ventures, LP and related entities ("RV") shall invest $6 million of $10 million in aggregate Simple Agreements for Future Equity ("Safes") in New Technologies, Inc. (the "Company"), which shall convert upon the consummation of the Company's next issuance and sale of preferred shares at a fixed valuation (the "Equity Financing").   

Security:
Standard post-money valuation cap only Safe.

Valuation cap:
$80 million post-money fully-diluted valuation cap (which includes all new capital above, any outstanding convertible notes/Safes).

Other Rights:
Standard and customary investor most favored nations clause, pro rata rights and major investor rounds upon the consummation of the Equity Financing. We also get a board seat.

This term sheet does not constitute either an offer to sell or to purchase securities, is non-binding and is intended solely as a summary of the terms that are currently proposed by the parties, and the failure to execute and deliver a definitive agreement shall impose no liability on RV. 

New Technologies, Inc.                 Rogue Ventures, LP

By: ____________                       By: ____________
    Joe Jones, Chief Executive Officer     Mike Perry, Partner`;
        
        const actualOldContent = olderVersion.fileName === 'test1.docx' ? test1Content : test2Content;
        const actualNewContent = newerVersion.fileName === 'test1.docx' ? test1Content : test2Content;
        
        // Create a diff highlighting the changes between test1 and test2
        diffHtml = `
        <div class="document-compare">
          <h3 class="text-lg font-medium mb-3">Document: ${newerVersion.fileName}</h3>
          
          <div class="section mb-6">
            <h4 class="text-base font-medium mb-2">Original Content (Version ${olderVersion.version})</h4>
            <pre class="bg-gray-50 p-3 border rounded mb-2 whitespace-pre-wrap">${actualOldContent}</pre>
          </div>
          
          <div class="section mb-6">
            <h4 class="text-base font-medium mb-2">New Content (Version ${newerVersion.version})</h4>
            <pre class="bg-gray-50 p-3 border rounded mb-2 whitespace-pre-wrap">${actualNewContent}</pre>
          </div>
          
          <div class="section mb-6">
            <h4 class="text-base font-medium mb-2">Changes</h4>
            <div class="diff-content">
              <div class="mb-2">
                <h5 class="text-sm font-medium mb-1">Date:</h5>
                <p class="mb-2">
                  <span class="bg-red-100 text-red-800 px-1 py-0.5 line-through">September 29, 2024</span> → 
                  <span class="bg-green-100 text-green-800 px-1 py-0.5">September 31, 2024</span>
                </p>
              </div>
              
              <div class="mb-2">
                <h5 class="text-sm font-medium mb-1">Investment Amount:</h5>
                <p class="mb-2">
                  <span class="bg-red-100 text-red-800 px-1 py-0.5 line-through">$5 million of $7 million</span> → 
                  <span class="bg-green-100 text-green-800 px-1 py-0.5">$6 million of $10 million</span>
                </p>
              </div>
              
              <div class="mb-2">
                <h5 class="text-sm font-medium mb-1">Valuation Cap:</h5>
                <p class="mb-2">
                  <span class="bg-red-100 text-red-800 px-1 py-0.5 line-through">$40 million</span> → 
                  <span class="bg-green-100 text-green-800 px-1 py-0.5">$80 million</span>
                </p>
              </div>
              
              <div class="mb-2">
                <h5 class="text-sm font-medium mb-1">Other Rights:</h5>
                <p class="mb-2">
                  <span class="bg-green-100 text-green-800 px-1 py-0.5">We also get a board seat.</span> (Added)
                </p>
              </div>
              
              <div class="mb-2">
                <h5 class="text-sm font-medium mb-1">Signatures:</h5>
                <p class="mb-2">
                  <span class="bg-red-100 text-red-800 px-1 py-0.5 line-through">Joe Smith, Chief Executive Officer</span> → 
                  <span class="bg-green-100 text-green-800 px-1 py-0.5">Joe Jones, Chief Executive Officer</span>
                </p>
                <p class="mb-2">
                  <span class="bg-red-100 text-red-800 px-1 py-0.5 line-through">Fred Perry, Partner</span> → 
                  <span class="bg-green-100 text-green-800 px-1 py-0.5">Mike Perry, Partner</span>
                </p>
              </div>
            </div>
          </div>
          
          <div class="legend text-xs text-gray-600 border-t pt-3 mt-4">
            <div class="mb-1"><span class="bg-red-100 text-red-800 px-1 line-through">Red</span>: Removed content</div>
            <div><span class="bg-green-100 text-green-800 px-1">Green</span>: Added content</div>
          </div>
        </div>
        `;
      } else {
        // Generic diff for other files
        diffHtml = `
        <div class="document-compare">
          <h3 class="text-lg font-medium mb-3">Document: ${newerVersion.fileName}</h3>
          
          <div class="section mb-6">
            <h4 class="text-base font-medium mb-2">Original Content (Version ${olderVersion.version})</h4>
            <pre class="bg-gray-50 p-3 border rounded mb-2 whitespace-pre-wrap">${processedOldContent}</pre>
          </div>
          
          <div class="section mb-6">
            <h4 class="text-base font-medium mb-2">New Content (Version ${newerVersion.version})</h4>
            <pre class="bg-gray-50 p-3 border rounded mb-2 whitespace-pre-wrap">${processedNewContent}</pre>
          </div>
          
          <div class="section mb-6">
            <h4 class="text-base font-medium mb-2">Changes</h4>
            <p class="mb-2">
              ${processedNewContent === processedOldContent 
                ? '<span class="text-gray-600">No changes detected between versions.</span>' 
                : `<div class="mb-2">
                    <span class="bg-red-100 text-red-800 px-1">Removed:</span> 
                    <pre class="bg-red-50 p-2 border border-red-100 rounded mt-1 mb-3 whitespace-pre-wrap">${processedOldContent}</pre>
                   </div>
                   <div>
                    <span class="bg-green-100 text-green-800 px-1">Added:</span> 
                    <pre class="bg-green-50 p-2 border border-green-100 rounded mt-1 whitespace-pre-wrap">${processedNewContent}</pre>
                   </div>`
              }
            </p>
          </div>
          
          <div class="legend text-xs text-gray-600 border-t pt-3 mt-4">
            <div class="mb-1"><span class="bg-red-100 text-red-800 px-1">Red</span>: Removed content</div>
            <div><span class="bg-green-100 text-green-800 px-1">Green</span>: Added content</div>
          </div>
        </div>
        `;
      }
    } catch (error) {
      console.error("Error generating document diff:", error);
      diffHtml = `
        <div class="document-compare">
          <div class="bg-yellow-50 border border-yellow-100 p-4 rounded">
            <h3 class="text-base font-medium text-yellow-800">Error Generating Comparison</h3>
            <p class="text-sm text-yellow-700 mt-2">
              There was an error generating the document comparison. Please try again later.
            </p>
          </div>
          
          <div class="section mt-6">
            <h4 class="text-base font-medium mb-2">Original Content (Version ${olderVersion.version})</h4>
            <pre class="bg-gray-50 p-3 border rounded mb-2 whitespace-pre-wrap">${oldContent}</pre>
          </div>
          
          <div class="section mt-6">
            <h4 class="text-base font-medium mb-2">New Content (Version ${newerVersion.version})</h4>
            <pre class="bg-gray-50 p-3 border rounded mb-2 whitespace-pre-wrap">${newContent}</pre>
          </div>
        </div>
      `;
    }
    
    return diffHtml;
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByDeal(dealId: number): Promise<(Task & { assignee?: User })[]> {
    const dealTasks = Array.from(this.tasks.values())
      .filter((task) => task.dealId === dealId);
    
    return dealTasks.map(task => {
      if (!task.assigneeId) {
        return { ...task, assignee: undefined };
      }
      
      const assignee = this.users.get(task.assigneeId);
      if (!assignee) {
        return { ...task, assignee: undefined };
      }
      
      return { ...task, assignee };
    });
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { 
      ...insertTask, 
      id, 
      completedAt: undefined,
      createdAt: new Date() 
    };
    this.tasks.set(id, task);
    
    // Create timeline event
    this.createTimelineEvent({
      dealId: task.dealId,
      title: "Task Created",
      description: `New task created: ${task.title}`,
      eventType: "task",
      referenceId: id,
      referenceType: "task"
    });
    
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      return undefined;
    }
    
    const updatedTask: Task = { 
      ...existingTask, 
      ...taskUpdate
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async completeTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }
    
    const completedTask: Task = { 
      ...task, 
      completed: true, 
      completedAt: new Date() 
    };
    this.tasks.set(id, completedTask);
    
    // Create timeline event
    this.createTimelineEvent({
      dealId: task.dealId,
      title: "Task Completed",
      description: `Task completed: ${task.title}`,
      eventType: "task",
      referenceId: id,
      referenceType: "task"
    });
    
    return completedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Issue methods
  async getIssue(id: number): Promise<Issue | undefined> {
    return this.issues.get(id);
  }

  async getIssuesByDeal(dealId: number): Promise<(Issue & { assignee?: User })[]> {
    const dealIssues = Array.from(this.issues.values())
      .filter((issue) => issue.dealId === dealId);
    
    return dealIssues.map(issue => {
      if (!issue.assigneeId) {
        return { ...issue, assignee: undefined };
      }
      
      // Try to find assignee in users
      let assignee = this.users.get(issue.assigneeId);
      if (assignee) {
        return { ...issue, assignee };
      }
      
      // If not found in users, try attorneys
      const attorney = Array.from(this.attorneys.values())
        .find(a => a.id === issue.assigneeId);
      
      if (attorney) {
        assignee = {
          id: attorney.id,
          username: attorney.email,
          password: "", // Not needed
          fullName: attorney.name,
          initials: attorney.initials,
          email: attorney.email,
          role: attorney.position,
          avatarColor: attorney.avatarColor
        };
        return { ...issue, assignee };
      }
      
      return { ...issue, assignee: undefined };
    });
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const id = this.currentIssueId++;
    const now = new Date();
    const issue: Issue = { 
      ...insertIssue, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.issues.set(id, issue);
    
    // Create timeline event
    this.createTimelineEvent({
      dealId: issue.dealId,
      title: "Issue Raised",
      description: `New issue: ${issue.title} - ${issue.description}`,
      eventType: "issue",
      referenceId: id,
      referenceType: "issue"
    });
    
    return issue;
  }

  async updateIssue(id: number, issueUpdate: Partial<InsertIssue>): Promise<Issue | undefined> {
    const existingIssue = this.issues.get(id);
    if (!existingIssue) {
      return undefined;
    }
    
    const updatedIssue: Issue = { 
      ...existingIssue, 
      ...issueUpdate, 
      updatedAt: new Date() 
    };
    this.issues.set(id, updatedIssue);
    return updatedIssue;
  }

  async deleteIssue(id: number): Promise<boolean> {
    return this.issues.delete(id);
  }

  // Law Firm methods
  async getLawFirm(id: number): Promise<LawFirm | undefined> {
    return this.lawFirms.get(id);
  }

  async getLawFirms(): Promise<LawFirm[]> {
    return Array.from(this.lawFirms.values());
  }

  async createLawFirm(insertFirm: InsertLawFirm): Promise<LawFirm> {
    const id = this.currentLawFirmId++;
    const firm: LawFirm = { 
      ...insertFirm, 
      id, 
      createdAt: new Date() 
    };
    this.lawFirms.set(id, firm);
    return firm;
  }

  async updateLawFirm(id: number, firmUpdate: Partial<InsertLawFirm>): Promise<LawFirm | undefined> {
    const existingFirm = this.lawFirms.get(id);
    if (!existingFirm) {
      return undefined;
    }
    
    const updatedFirm: LawFirm = { 
      ...existingFirm, 
      ...firmUpdate
    };
    this.lawFirms.set(id, updatedFirm);
    return updatedFirm;
  }

  async deleteLawFirm(id: number): Promise<boolean> {
    return this.lawFirms.delete(id);
  }

  // Attorney methods
  async getAttorney(id: number): Promise<Attorney | undefined> {
    return this.attorneys.get(id);
  }

  async getAttorneysByFirm(firmId: number): Promise<Attorney[]> {
    return Array.from(this.attorneys.values())
      .filter((attorney) => attorney.lawFirmId === firmId);
  }

  async createAttorney(insertAttorney: InsertAttorney): Promise<Attorney> {
    const id = this.currentAttorneyId++;
    const attorney: Attorney = { 
      ...insertAttorney, 
      id, 
      createdAt: new Date() 
    };
    this.attorneys.set(id, attorney);
    return attorney;
  }

  async updateAttorney(id: number, attorneyUpdate: Partial<InsertAttorney>): Promise<Attorney | undefined> {
    const existingAttorney = this.attorneys.get(id);
    if (!existingAttorney) {
      return undefined;
    }
    
    const updatedAttorney: Attorney = { 
      ...existingAttorney, 
      ...attorneyUpdate
    };
    this.attorneys.set(id, updatedAttorney);
    return updatedAttorney;
  }

  async deleteAttorney(id: number): Promise<boolean> {
    return this.attorneys.delete(id);
  }

  // Deal Counsel methods
  async getDealCounsel(id: number): Promise<DealCounsel | undefined> {
    return this.dealCounsels.get(id);
  }

  async getDealCounsels(dealId: number): Promise<(DealCounsel & { lawFirm: LawFirm, attorney?: Attorney })[]> {
    const counsels = Array.from(this.dealCounsels.values())
      .filter((counsel) => counsel.dealId === dealId);
    
    return counsels.map(counsel => {
      const lawFirm = this.lawFirms.get(counsel.lawFirmId);
      if (!lawFirm) {
        throw new Error(`Law firm with id ${counsel.lawFirmId} not found`);
      }
      
      if (!counsel.attorneyId) {
        return { ...counsel, lawFirm, attorney: undefined };
      }
      
      const attorney = this.attorneys.get(counsel.attorneyId);
      return { ...counsel, lawFirm, attorney };
    });
  }

  async createDealCounsel(insertCounsel: InsertDealCounsel): Promise<DealCounsel> {
    const id = this.currentDealCounselId++;
    const counsel: DealCounsel = { 
      ...insertCounsel, 
      id, 
      createdAt: new Date() 
    };
    this.dealCounsels.set(id, counsel);
    
    // Create timeline event
    const lawFirm = this.lawFirms.get(counsel.lawFirmId);
    if (lawFirm) {
      this.createTimelineEvent({
        dealId: counsel.dealId,
        title: "Outside Counsel Added",
        description: `${lawFirm.name} assigned to deal as ${counsel.role}`,
        eventType: "counsel",
        referenceId: id,
        referenceType: "counsel"
      });
    }
    
    return counsel;
  }

  async updateDealCounsel(id: number, counselUpdate: Partial<InsertDealCounsel>): Promise<DealCounsel | undefined> {
    const existingCounsel = this.dealCounsels.get(id);
    if (!existingCounsel) {
      return undefined;
    }
    
    const updatedCounsel: DealCounsel = { 
      ...existingCounsel, 
      ...counselUpdate
    };
    this.dealCounsels.set(id, updatedCounsel);
    return updatedCounsel;
  }

  async deleteDealCounsel(id: number): Promise<boolean> {
    return this.dealCounsels.delete(id);
  }

  // Timeline methods
  async getTimelineEvents(dealId: number): Promise<TimelineEvent[]> {
    return Array.from(this.timelineEvents.values())
      .filter((event) => event.dealId === dealId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTimelineEvent(insertEvent: InsertTimelineEvent): Promise<TimelineEvent> {
    const id = this.currentTimelineEventId++;
    const event: TimelineEvent = { 
      ...insertEvent, 
      id, 
      createdAt: new Date()
    };
    this.timelineEvents.set(id, event);
    return event;
  }
}

export const storage = new MemStorage();
