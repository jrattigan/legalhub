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

    // Since we can't use async/await in the constructor, 
    // we'll create users directly for sample data
    const id1 = this.currentUserId++;
    const createdUser1: User = { ...user1, id: id1 };
    this.users.set(id1, createdUser1);
    
    const id2 = this.currentUserId++;
    const createdUser2: User = { ...user2, id: id2 };
    this.users.set(id2, createdUser2);
    
    const id3 = this.currentUserId++;
    const createdUser3: User = { ...user3, id: id3 };
    this.users.set(id3, createdUser3);

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

    // Create firms directly for sample data
    const firmId1 = this.currentLawFirmId++;
    const createdFirm1: LawFirm = { 
      ...firm1, 
      id: firmId1, 
      createdAt: new Date(),
      email: firm1.email || null,
      phone: firm1.phone || null 
    };
    this.lawFirms.set(firmId1, createdFirm1);
    
    const firmId2 = this.currentLawFirmId++;
    const createdFirm2: LawFirm = { 
      ...firm2, 
      id: firmId2, 
      createdAt: new Date(),
      email: firm2.email || null,
      phone: firm2.phone || null 
    };
    this.lawFirms.set(firmId2, createdFirm2);

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

    // Create attorneys directly for sample data
    const attorneyId1 = this.currentAttorneyId++;
    const createdAttorney1: Attorney = { 
      ...attorney1, 
      id: attorneyId1, 
      createdAt: new Date(),
      phone: attorney1.phone || null
    };
    this.attorneys.set(attorneyId1, createdAttorney1);
    
    const attorneyId2 = this.currentAttorneyId++;
    const createdAttorney2: Attorney = { 
      ...attorney2, 
      id: attorneyId2, 
      createdAt: new Date(),
      phone: attorney2.phone || null
    };
    this.attorneys.set(attorneyId2, createdAttorney2);

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

    // Create deals directly for sample data
    const now = new Date();
    const dealId1 = this.currentDealId++;
    const createdDeal1: Deal = { 
      ...deal1, 
      id: dealId1, 
      createdAt: now, 
      updatedAt: now,
      status: deal1.status || 'pending',
      description: deal1.description || null,
      dueDate: deal1.dueDate || null,
      amount: deal1.amount || null 
    };
    this.deals.set(dealId1, createdDeal1);
    
    const dealId2 = this.currentDealId++;
    const createdDeal2: Deal = { 
      ...deal2, 
      id: dealId2, 
      createdAt: now, 
      updatedAt: now,
      status: deal2.status || 'pending',
      description: deal2.description || null,
      dueDate: deal2.dueDate || null,
      amount: deal2.amount || null 
    };
    this.deals.set(dealId2, createdDeal2);
    
    const dealId3 = this.currentDealId++;
    const createdDeal3: Deal = { 
      ...deal3, 
      id: dealId3, 
      createdAt: now, 
      updatedAt: now,
      status: deal3.status || 'pending',
      description: deal3.description || null,
      dueDate: deal3.dueDate || null,
      amount: deal3.amount || null 
    };
    this.deals.set(dealId3, createdDeal3);

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

    // Create documents directly for sample data
    const docId1 = this.currentDocumentId++;
    const now1 = new Date();
    const createdDoc1: Document = { 
      ...doc1, 
      id: docId1, 
      createdAt: now1, 
      updatedAt: now1,
      status: doc1.status || "Draft",
      description: doc1.description || null,
      assigneeId: doc1.assigneeId || null
    };
    this.documents.set(docId1, createdDoc1);
    
    const docId2 = this.currentDocumentId++;
    const now2 = new Date();
    const createdDoc2: Document = { 
      ...doc2, 
      id: docId2, 
      createdAt: now2, 
      updatedAt: now2,
      status: doc2.status || "Draft",
      description: doc2.description || null,
      assigneeId: doc2.assigneeId || null
    };
    this.documents.set(docId2, createdDoc2);
    
    const docId3 = this.currentDocumentId++;
    const now3 = new Date();
    const createdDoc3: Document = { 
      ...doc3, 
      id: docId3, 
      createdAt: now3, 
      updatedAt: now3,
      status: doc3.status || "Draft",
      description: doc3.description || null,
      assigneeId: doc3.assigneeId || null
    };
    this.documents.set(docId3, createdDoc3);

    // Add document versions directly
    const version1: InsertDocumentVersion = {
      documentId: createdDoc1.id,
      version: 1,
      fileName: "stock_purchase_v1.pdf",
      fileSize: 1200000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdUser3.id,
      comment: "Initial draft"
    };
    const versionId1 = this.currentVersionId++;
    const createdVersion1: DocumentVersion = {
      ...version1,
      id: versionId1,
      createdAt: new Date(),
      comment: version1.comment || null
    };
    this.documentVersions.set(versionId1, createdVersion1);
    
    const version2: InsertDocumentVersion = {
      documentId: createdDoc1.id,
      version: 2,
      fileName: "stock_purchase_v2.pdf",
      fileSize: 1250000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdAttorney1.id,
      comment: "Reviewed by outside counsel"
    };
    const versionId2 = this.currentVersionId++;
    const createdVersion2: DocumentVersion = {
      ...version2,
      id: versionId2,
      createdAt: new Date(),
      comment: version2.comment || null
    };
    this.documentVersions.set(versionId2, createdVersion2);
    
    const version3: InsertDocumentVersion = {
      documentId: createdDoc1.id,
      version: 3,
      fileName: "stock_purchase_v3.pdf",
      fileSize: 1280000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdAttorney1.id,
      comment: "Redlined by outside counsel"
    };
    const versionId3 = this.currentVersionId++;
    const createdVersion3: DocumentVersion = {
      ...version3,
      id: versionId3,
      createdAt: new Date(),
      comment: version3.comment || null
    };
    this.documentVersions.set(versionId3, createdVersion3);
    
    const version4: InsertDocumentVersion = {
      documentId: createdDoc1.id,
      version: 4,
      fileName: "stock_purchase_v4.pdf",
      fileSize: 1300000,
      fileType: "application/pdf",
      fileContent: "base64_encoded_content_placeholder",
      uploadedById: createdUser1.id,
      comment: "Added investor signature page"
    };
    const versionId4 = this.currentVersionId++;
    const createdVersion4: DocumentVersion = {
      ...version4,
      id: versionId4,
      createdAt: new Date(),
      comment: version4.comment || null
    };
    this.documentVersions.set(versionId4, createdVersion4);

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

    // Create tasks directly for sample data with fully specified objects
    const taskId1 = this.currentTaskId++;
    const createdTask1: Task = { 
      id: taskId1,
      dealId: task1.dealId,
      title: task1.title,
      description: task1.description || null, // Ensure null instead of undefined
      status: "active", // Use explicit value
      priority: "high", // Use explicit value
      dueDate: task1.dueDate || null, // Ensure null instead of undefined
      assigneeId: task1.assigneeId || null, // Ensure null instead of undefined
      completed: false, // Use explicit value
      completedAt: null,
      createdAt: new Date()
    };
    this.tasks.set(taskId1, createdTask1);

    const taskId2 = this.currentTaskId++;
    const createdTask2: Task = { 
      id: taskId2,
      dealId: task2.dealId,
      title: task2.title,
      description: task2.description || null, // Ensure null instead of undefined
      status: "completed", // Use explicit value
      priority: "medium", // Use explicit value
      dueDate: task2.dueDate || null, // Ensure null instead of undefined
      assigneeId: task2.assigneeId || null, // Ensure null instead of undefined
      completed: true, // Use explicit value
      completedAt: new Date(), // Task is completed
      createdAt: new Date()
    };
    this.tasks.set(taskId2, createdTask2);

    const taskId3 = this.currentTaskId++;
    const createdTask3: Task = { 
      id: taskId3,
      dealId: task3.dealId,
      title: task3.title,
      description: task3.description || null, // Ensure null instead of undefined
      status: "active", // Use explicit value
      priority: "medium", // Use explicit value
      dueDate: task3.dueDate || null, // Ensure null instead of undefined
      assigneeId: task3.assigneeId || null, // Ensure null instead of undefined
      completed: false, // Use explicit value
      completedAt: null,
      createdAt: new Date()
    };
    this.tasks.set(taskId3, createdTask3);

    // Create issues for Deal 1 with explicit values for all required fields
    const issue1: InsertIssue = {
      dealId: createdDeal1.id,
      title: "Valuation disagreement",
      description: "Investors pushing for 20% discount to last round valuation",
      status: "open",  // Use the schema default from shared/schema.ts
      priority: "high",
      assigneeId: createdAttorney1.id
    };
    
    const issue2: InsertIssue = {
      dealId: createdDeal1.id,
      title: "Board seat negotiation",
      description: "Lead investor requesting additional board seat",
      status: "open",  // Use the schema default from shared/schema.ts
      priority: "medium",
      assigneeId: createdUser1.id
    };

    // Create issues directly for sample data with all required fields
    const issueId1 = this.currentIssueId++;
    const issueDate1 = new Date();
    const createdIssue1: Issue = { 
      id: issueId1,
      dealId: issue1.dealId,
      title: issue1.title,
      description: issue1.description,
      status: "open", // Use explicit value instead of optional chaining
      priority: "high", // Use explicit value instead of optional chaining
      assigneeId: issue1.assigneeId || null, // Ensure assigneeId is number or null, not undefined
      createdAt: issueDate1, 
      updatedAt: issueDate1
    };
    this.issues.set(issueId1, createdIssue1);
    
    const issueId2 = this.currentIssueId++;
    const issueDate2 = new Date();
    const createdIssue2: Issue = { 
      id: issueId2,
      dealId: issue2.dealId,
      title: issue2.title,
      description: issue2.description,
      status: "open", // Use explicit value instead of optional chaining
      priority: "medium", // Use explicit value instead of optional chaining
      assigneeId: issue2.assigneeId || null, // Ensure assigneeId is number or null, not undefined
      createdAt: issueDate2, 
      updatedAt: issueDate2
    };
    this.issues.set(issueId2, createdIssue2);

    // Create timeline events directly with all required fields 
    const event1: InsertTimelineEvent = {
      dealId: createdDeal1.id,
      title: "Term Sheet Updated",
      description: "Sarah Wilson from Smith & Wilson LLP reviewed and updated the term sheet with new valuation terms.",
      eventType: "document",
      referenceId: createdDoc3.id,
      referenceType: "document"
    };
    const eventId1 = this.currentTimelineEventId++;
    const eventDate1 = new Date();
    const createdEvent1: TimelineEvent = {
      id: eventId1,
      dealId: event1.dealId,
      title: event1.title,
      description: event1.description,
      eventType: event1.eventType,
      createdAt: eventDate1,
      referenceId: event1.referenceId || null,
      referenceType: event1.referenceType || null
    };
    this.timelineEvents.set(eventId1, createdEvent1);
    
    const event2: InsertTimelineEvent = {
      dealId: createdDeal1.id,
      title: "Issue Raised",
      description: "Valuation disagreement with lead investor. Investors pushing for 20% discount to last round.",
      eventType: "issue",
      referenceId: createdIssue1.id,
      referenceType: "issue"
    };
    const eventId2 = this.currentTimelineEventId++;
    const eventDate2 = new Date();
    const createdEvent2: TimelineEvent = {
      id: eventId2,
      dealId: event2.dealId,
      title: event2.title,
      description: event2.description,
      eventType: event2.eventType,
      createdAt: eventDate2,
      referenceId: event2.referenceId || null,
      referenceType: event2.referenceType || null
    };
    this.timelineEvents.set(eventId2, createdEvent2);
    
    const event3: InsertTimelineEvent = {
      dealId: createdDeal1.id,
      title: "Cap Table Completed",
      description: "Financial team completed and verified the capitalization table for the Series C round.",
      eventType: "task",
      referenceId: createdTask2.id,
      referenceType: "task"
    };
    const eventId3 = this.currentTimelineEventId++;
    const eventDate3 = new Date();
    const createdEvent3: TimelineEvent = {
      id: eventId3,
      dealId: event3.dealId,
      title: event3.title,
      description: event3.description,
      eventType: event3.eventType,
      createdAt: eventDate3,
      referenceId: event3.referenceId || null,
      referenceType: event3.referenceType || null
    };
    this.timelineEvents.set(eventId3, createdEvent3);
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
      updatedAt: now,
      status: insertDeal.status || 'pending',
      description: insertDeal.description || null,
      dueDate: insertDeal.dueDate || null,
      amount: insertDeal.amount || null
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

  // Deal User methods
  async getDealUsers(dealId: number): Promise<(DealUser & { user: User })[]> {
    const dealUsersList = Array.from(this.dealUsers.values())
      .filter((dealUser) => dealUser.dealId === dealId);
    
    return dealUsersList.map(dealUser => {
      const user = this.users.get(dealUser.userId);
      if (!user) {
        throw new Error(`User with id ${dealUser.userId} not found`);
      }
      
      return { ...dealUser, user };
    });
  }

  async addUserToDeal(insertDealUser: InsertDealUser): Promise<DealUser> {
    const id = this.currentDealUserId++;
    const dealUser: DealUser = { ...insertDealUser, id };
    this.dealUsers.set(id, dealUser);
    return dealUser;
  }

  async removeUserFromDeal(dealId: number, userId: number): Promise<boolean> {
    const dealUser = Array.from(this.dealUsers.values())
      .find(du => du.dealId === dealId && du.userId === userId);
    
    if (!dealUser) {
      return false;
    }
    
    return this.dealUsers.delete(dealUser.id);
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByDeal(dealId: number): Promise<(Document & { versions: number })[]> {
    const dealDocuments = Array.from(this.documents.values())
      .filter((document) => document.dealId === dealId);
    
    return Promise.all(dealDocuments.map(async document => {
      const versionCount = await this.getLatestVersionNumber(document.id);
      return { ...document, versions: versionCount };
    }));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const now = new Date();
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: now, 
      updatedAt: now,
      status: insertDocument.status || 'Draft',
      description: insertDocument.description || null,
      assigneeId: insertDocument.assigneeId || null
    };
    
    this.documents.set(id, document);
    
    // Create timeline event for document creation
    this.createTimelineEvent({
      dealId: document.dealId,
      title: "Document Created",
      description: `New document created: ${document.title}`,
      eventType: "document",
      referenceId: id,
      referenceType: "document"
    });
    
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
    // Delete all versions first
    const versions = Array.from(this.documentVersions.values())
      .filter(v => v.documentId === id);
    
    for (const version of versions) {
      this.documentVersions.delete(version.id);
    }
    
    return this.documents.delete(id);
  }

  // Document Version methods
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    return this.documentVersions.get(id);
  }

  async getDocumentVersions(documentId: number): Promise<(DocumentVersion & { uploadedBy: User })[]> {
    const versions = Array.from(this.documentVersions.values())
      .filter((version) => version.documentId === documentId)
      .sort((a, b) => a.version - b.version);
    
    return versions.map(version => {
      const uploadedBy = this.users.get(version.uploadedById) || 
                       Array.from(this.attorneys.values()).find(a => a.id === version.uploadedById);
      
      // If it's an attorney, create a User-like object
      if (uploadedBy && !('username' in uploadedBy)) {
        const attorney = uploadedBy as Attorney;
        const userLike: User = {
          id: attorney.id,
          username: attorney.email,
          password: "", // Not needed
          fullName: attorney.name,
          initials: attorney.initials,
          email: attorney.email,
          role: attorney.position,
          avatarColor: attorney.avatarColor
        };
        return { ...version, uploadedBy: userLike };
      }
      
      if (!uploadedBy) {
        throw new Error(`Uploader with id ${version.uploadedById} not found`);
      }
      
      return { ...version, uploadedBy: uploadedBy as User };
    });
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = this.currentVersionId++;
    const version: DocumentVersion = { 
      ...insertVersion, 
      id, 
      createdAt: new Date(),
      comment: insertVersion.comment || null
    };
    this.documentVersions.set(id, version);
    
    // Create timeline event
    const document = this.documents.get(version.documentId);
    if (document) {
      this.createTimelineEvent({
        dealId: document.dealId,
        title: `Document Updated`,
        description: `New version (v${version.version}) of ${document.title} uploaded. ${version.comment ? `Comment: ${version.comment}` : ''}`,
        eventType: "document",
        referenceId: document.id,
        referenceType: "document"
      });
    }
    
    return version;
  }

  async getLatestVersionNumber(documentId: number): Promise<number> {
    const versions = Array.from(this.documentVersions.values())
      .filter((version) => version.documentId === documentId);
    
    if (versions.length === 0) {
      return 0; // No versions yet
    }
    
    return Math.max(...versions.map(v => v.version));
  }

  async compareDocumentVersions(versionId1: number, versionId2: number, customContent1?: string, customContent2?: string): Promise<string> {
    // Import our intelligent document comparison utility
    const { generateDocumentComparison } = require('./document-compare');
    
    const version1 = this.documentVersions.get(versionId1);
    const version2 = this.documentVersions.get(versionId2);
    
    if (!version1 || !version2) {
      throw new Error("One or both document versions not found");
    }
    
    // Determine which version is newer
    const olderVersion = version1.version < version2.version ? version1 : version2;
    const newerVersion = version1.version > version2.version ? version1 : version2;
    
    // Use our dedicated document comparison module
    return generateDocumentComparison(olderVersion, newerVersion, customContent1, customContent2);
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
    
    // Create a complete Task object ensuring all required fields are present
    const task: Task = {
      id,
      dealId: insertTask.dealId,
      title: insertTask.title,
      description: insertTask.description || null,
      status: insertTask.status || 'pending',
      priority: insertTask.priority || 'medium',
      dueDate: insertTask.dueDate || null,
      assigneeId: insertTask.assigneeId || null,
      completed: insertTask.completed || false,
      completedAt: null,
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
    
    // Create a complete Issue object with all required fields
    const issue: Issue = {
      id,
      dealId: insertIssue.dealId,
      title: insertIssue.title,
      description: insertIssue.description,
      status: insertIssue.status || 'open',
      priority: insertIssue.priority || 'medium',
      assigneeId: insertIssue.assigneeId || null,
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
      email: insertFirm.email || null,
      phone: insertFirm.phone || null,
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
      phone: insertAttorney.phone || null,
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
      attorneyId: insertCounsel.attorneyId || null,
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
      .filter(event => event.dealId === dealId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTimelineEvent(insertEvent: InsertTimelineEvent): Promise<TimelineEvent> {
    const id = this.currentTimelineEventId++;
    
    // Create a complete TimelineEvent object with all required fields
    const event: TimelineEvent = {
      id,
      dealId: insertEvent.dealId,
      title: insertEvent.title,
      description: insertEvent.description,
      eventType: insertEvent.eventType,
      referenceId: insertEvent.referenceId || null,
      referenceType: insertEvent.referenceType || null,
      createdAt: new Date()
    };
    
    this.timelineEvents.set(id, event);
    return event;
  }
}

export const storage = new MemStorage();