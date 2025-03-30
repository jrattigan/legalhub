import {
  users, User, InsertUser,
  companies, Company, InsertCompany,
  deals, Deal, InsertDeal,
  dealUsers, DealUser, InsertDealUser,
  documents, Document, InsertDocument,
  documentVersions, DocumentVersion, InsertDocumentVersion,
  tasks, Task, InsertTask,
  issues, Issue, InsertIssue,
  lawFirms, LawFirm, InsertLawFirm,
  attorneys, Attorney, InsertAttorney, 
  dealCounsels, DealCounsel, InsertDealCounsel,
  timelineEvents, TimelineEvent, InsertTimelineEvent,
  appSettings, AppSetting, InsertAppSetting,
  funds, Fund, InsertFund,
  allocations, Allocation, InsertAllocation
} from "@shared/schema";
import { format } from 'date-fns';
import { generateDocumentComparison } from './document-compare';

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  
  // Companies
  getCompany(id: number): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;

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
  getAttorneys(): Promise<Attorney[]>;
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
  
  // App Settings
  getAppSettings(): Promise<AppSetting[]>;
  getAppSettingByKey(key: string): Promise<AppSetting | undefined>;
  createAppSetting(setting: InsertAppSetting): Promise<AppSetting>;
  updateAppSetting(id: number, setting: Partial<InsertAppSetting>): Promise<AppSetting | undefined>;
  deleteAppSetting(id: number): Promise<boolean>;
  
  // Funds
  getFunds(): Promise<Fund[]>;
  getFund(id: number): Promise<Fund | undefined>;
  createFund(fund: InsertFund): Promise<Fund>;
  updateFund(id: number, fund: Partial<InsertFund>): Promise<Fund | undefined>;
  deleteFund(id: number): Promise<boolean>;
  
  // Allocations
  getAllocations(dealId: number): Promise<(Allocation & { fund: Fund })[]>;
  getAllocation(id: number): Promise<Allocation | undefined>;
  createAllocation(allocation: InsertAllocation): Promise<Allocation>;
  updateAllocation(id: number, allocation: Partial<InsertAllocation>): Promise<Allocation | undefined>;
  deleteAllocation(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
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
  private appSettings: Map<number, AppSetting>;
  private funds: Map<number, Fund>;
  private allocations: Map<number, Allocation>;

  currentUserId: number;
  currentCompanyId: number;
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
  currentAppSettingId: number;
  currentFundId: number;
  currentAllocationId: number;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
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
    this.appSettings = new Map();
    this.funds = new Map();
    this.allocations = new Map();

    this.currentUserId = 1;
    this.currentCompanyId = 1;
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
    this.currentAppSettingId = 1;
    this.currentFundId = 1;
    this.currentAllocationId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  // Initialize with sample data to have a working app on start
  private initializeSampleData() {
    // Create global app settings
    const organizationSetting: InsertAppSetting = {
      key: "organizationName",
      value: "Rogue Capital Ventures"
    };
    
    const initialTime = new Date();
    const settingId = this.currentAppSettingId++;
    const createdSetting: AppSetting = {
      ...organizationSetting,
      id: settingId,
      createdAt: initialTime,
      updatedAt: initialTime
    };
    this.appSettings.set(settingId, createdSetting);
    
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

    // Create sample companies
    const company1: InsertCompany = {
      legalName: "Acme Corporation",
      displayName: "Acme Corp",
      url: "https://acmecorp.com",
      bcvTeam: ["Sarah Johnson", "Mike Chen"]
    };
    
    const company2: InsertCompany = {
      legalName: "TechStart Incorporated",
      displayName: "TechStart Inc.",
      url: "https://techstart.io",
      bcvTeam: ["David Lee", "Emily Wong"]
    };
    
    const company3: InsertCompany = {
      legalName: "HealthTech Solutions",
      displayName: "HealthTech",
      url: "https://healthtech.com",
      bcvTeam: ["James Smith", "Aisha Patel"]
    };
    
    // Create companies directly for sample data
    const now4 = new Date();
    const companyId1 = this.currentCompanyId++;
    const createdCompany1: Company = {
      ...company1,
      id: companyId1,
      createdAt: now4,
      updatedAt: now4,
      url: company1.url || null,
      bcvTeam: Array.isArray(company1.bcvTeam) ? company1.bcvTeam : []
    };
    this.companies.set(companyId1, createdCompany1);
    
    const companyId2 = this.currentCompanyId++;
    const createdCompany2: Company = {
      ...company2,
      id: companyId2,
      createdAt: now4,
      updatedAt: now4,
      url: company2.url || null,
      bcvTeam: Array.isArray(company2.bcvTeam) ? company2.bcvTeam : []
    };
    this.companies.set(companyId2, createdCompany2);
    
    const companyId3 = this.currentCompanyId++;
    const createdCompany3: Company = {
      ...company3,
      id: companyId3,
      createdAt: now4,
      updatedAt: now4,
      url: company3.url || null,
      bcvTeam: Array.isArray(company3.bcvTeam) ? company3.bcvTeam : []
    };
    this.companies.set(companyId3, createdCompany3);
    
    // Get the organization name from settings
    const orgName = "Rogue Capital Ventures"; // Default in case not initialized yet

    // Create deals with proper company references
    const deal1: InsertDeal = {
      title: "Acme Corp Series C Financing",
      description: "$45M investment round led by Venture Partners",
      dealId: "ACM-2023-C",
      status: "in-progress",
      dueDate: new Date("2023-10-15"),
      companyId: createdCompany1.id,
      companyName: createdCompany1.displayName,
      amount: "$45M",
      leadInvestor: orgName,
      leadInvestorCounsel: ""  // Empty as org is the lead investor
    };
    const deal2: InsertDeal = {
      title: "TechStart Acquisition",
      description: "Acquisition of TechStart Inc. - $28M",
      dealId: "TS-2023-ACQ",
      status: "completed",
      dueDate: new Date("2023-09-22"),
      companyId: createdCompany2.id,
      companyName: createdCompany2.displayName,
      amount: "$28M",
      leadInvestor: orgName,
      leadInvestorCounsel: ""  // Empty as org is the lead investor
    };
    const deal3: InsertDeal = {
      title: "HealthTech Series A",
      description: "$12M funding round for HealthTech startup",
      dealId: "HT-2023-A",
      status: "urgent",
      dueDate: new Date("2023-10-05"),
      companyId: createdCompany3.id,
      companyName: createdCompany3.displayName,
      amount: "$12M",
      leadInvestor: orgName,
      leadInvestorCounsel: ""  // Empty as org is the lead investor
    };

    // Create deals directly for sample data
    const dealTime = new Date();
    const dealId1 = this.currentDealId++;
    const createdDeal1: Deal = { 
      ...deal1, 
      id: dealId1, 
      createdAt: dealTime, 
      updatedAt: dealTime,
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
      createdAt: dealTime, 
      updatedAt: dealTime,
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
      createdAt: dealTime, 
      updatedAt: dealTime,
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
      taskType: "internal", // Internal task
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
      taskType: "internal", // Internal task
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
      taskType: "external", // External task
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
      assigneeType: "user", // Default to user for internal tasks
      taskType: task1.taskType || "internal", // Add taskType
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
      assigneeType: "user", // Default to user for internal tasks
      taskType: task2.taskType || "internal", // Add taskType
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
      assigneeType: "attorney", // This is an external task assigned to attorney
      taskType: task3.taskType || "external", // Add taskType - this one is external
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

    // Create sample funds for the organization
    const fund1: InsertFund = {
      name: "Rogue Capital Fund I",
      description: "Early stage investments in tech startups",
      isActive: true
    };
    
    const fund2: InsertFund = {
      name: "Rogue Capital Fund II",
      description: "Growth stage investments in tech and healthcare",
      isActive: true
    };
    
    const fund3: InsertFund = {
      name: "Rogue Special Opportunities",
      description: "Investments in special situations and distressed assets",
      isActive: true
    };
    
    // Create funds directly for sample data
    const fundTime = new Date();
    const fundId1 = this.currentFundId++;
    const createdFund1: Fund = {
      ...fund1,
      id: fundId1,
      createdAt: fundTime,
      updatedAt: fundTime
    };
    this.funds.set(fundId1, createdFund1);
    
    const fundId2 = this.currentFundId++;
    const createdFund2: Fund = {
      ...fund2,
      id: fundId2,
      createdAt: fundTime,
      updatedAt: fundTime
    };
    this.funds.set(fundId2, createdFund2);
    
    const fundId3 = this.currentFundId++;
    const createdFund3: Fund = {
      ...fund3,
      id: fundId3,
      createdAt: fundTime,
      updatedAt: fundTime
    };
    this.funds.set(fundId3, createdFund3);
    
    // Create allocations for Deal 1
    const allocation1: InsertAllocation = {
      dealId: createdDeal1.id,
      fundId: createdFund1.id,
      investmentAmount: 10000000, // $10M
      shareClass: "Series C Preferred",
      numberOfShares: 500000
    };
    
    const allocation2: InsertAllocation = {
      dealId: createdDeal1.id,
      fundId: createdFund2.id,
      investmentAmount: 15000000, // $15M
      shareClass: "Series C Preferred",
      numberOfShares: 750000
    };
    
    // Create allocations directly for sample data
    const allocationTime = new Date();
    const allocationId1 = this.currentAllocationId++;
    const createdAllocation1: Allocation = {
      ...allocation1,
      id: allocationId1,
      createdAt: allocationTime,
      updatedAt: allocationTime
    };
    this.allocations.set(allocationId1, createdAllocation1);
    
    const allocationId2 = this.currentAllocationId++;
    const createdAllocation2: Allocation = {
      ...allocation2,
      id: allocationId2,
      createdAt: allocationTime,
      updatedAt: allocationTime
    };
    this.allocations.set(allocationId2, createdAllocation2);
    
    // Create allocations for Deal 3
    const allocation3: InsertAllocation = {
      dealId: createdDeal3.id,
      fundId: createdFund3.id,
      investmentAmount: 5000000, // $5M
      shareClass: "Series A Preferred",
      numberOfShares: 1000000
    };
    
    const allocationId3 = this.currentAllocationId++;
    const createdAllocation3: Allocation = {
      ...allocation3,
      id: allocationId3,
      createdAt: allocationTime,
      updatedAt: allocationTime
    };
    this.allocations.set(allocationId3, createdAllocation3);

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
    
    // Add data for TechStart Acquisition (Deal 2)
    // Documents for deal 2
    const techDoc1: InsertDocument = {
      dealId: createdDeal2.id,
      title: "Acquisition Agreement",
      description: "Main agreement for the TechStart acquisition",
      category: "Legal",
      status: "Draft",
      fileType: "docx",
      assigneeId: 3
    };
    const techDocId1 = this.currentDocumentId++;
    const techDoc1Date = new Date();
    const createdTechDoc1: Document = {
      id: techDocId1,
      dealId: techDoc1.dealId,
      title: techDoc1.title,
      description: techDoc1.description,
      category: techDoc1.category,
      status: techDoc1.status,
      fileType: techDoc1.fileType,
      assigneeId: techDoc1.assigneeId,
      createdAt: techDoc1Date,
      updatedAt: techDoc1Date
    };
    this.documents.set(techDocId1, createdTechDoc1);
    
    const techDoc2: InsertDocument = {
      dealId: createdDeal2.id,
      title: "Due Diligence Report",
      description: "Complete analysis of TechStart assets and liabilities",
      category: "Financial",
      status: "Final",
      fileType: "pdf",
      assigneeId: 2
    };
    const techDocId2 = this.currentDocumentId++;
    const techDoc2Date = new Date();
    const createdTechDoc2: Document = {
      id: techDocId2,
      dealId: techDoc2.dealId,
      title: techDoc2.title,
      description: techDoc2.description,
      category: techDoc2.category,
      status: techDoc2.status,
      fileType: techDoc2.fileType,
      assigneeId: techDoc2.assigneeId,
      createdAt: techDoc2Date,
      updatedAt: techDoc2Date
    };
    this.documents.set(techDocId2, createdTechDoc2);
    
    // Document versions for TechStart deal
    const techVersion1: InsertDocumentVersion = {
      documentId: techDocId1,
      version: 1,
      fileName: "acquisition-agreement-v1.docx",
      fileSize: 145000,
      fileType: "docx",
      uploadedById: 3,
      content: "This Acquisition Agreement (the \"Agreement\") is made and entered into as of [Date], by and between Acme Corporation (\"Buyer\") and TechStart Inc. (\"Target\")..."
    };
    const techVersionId1 = this.currentVersionId++;
    const techVersionDate1 = new Date();
    const createdTechVersion1: DocumentVersion = {
      id: techVersionId1,
      documentId: techVersion1.documentId,
      version: techVersion1.version,
      fileName: techVersion1.fileName,
      fileSize: techVersion1.fileSize,
      fileType: techVersion1.fileType,
      uploadedById: techVersion1.uploadedById,
      content: techVersion1.content,
      createdAt: techVersionDate1
    };
    this.documentVersions.set(techVersionId1, createdTechVersion1);
    
    // Tasks for TechStart deal
    const techTask1: InsertTask = {
      dealId: createdDeal2.id,
      title: "Complete regulatory filings",
      description: "File all required regulatory paperwork for the acquisition",
      status: "in-progress",
      priority: "high",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
      assigneeId: 3,
      taskType: "external"  // External task
    };
    const techTaskId1 = this.currentTaskId++;
    const techTaskDate1 = new Date();
    const createdTechTask1: Task = {
      id: techTaskId1,
      dealId: techTask1.dealId,
      title: techTask1.title,
      description: techTask1.description,
      status: techTask1.status,
      priority: techTask1.priority,
      dueDate: techTask1.dueDate,
      assigneeId: techTask1.assigneeId,
      assigneeType: "attorney", // External task assigned to attorney
      taskType: techTask1.taskType || "external", // Add taskType with default
      completed: false, // Adding required field
      createdAt: techTaskDate1,
      updatedAt: techTaskDate1,
      completedAt: null
    };
    this.tasks.set(techTaskId1, createdTechTask1);
    
    const techTask2: InsertTask = {
      dealId: createdDeal2.id,
      title: "Finalize asset transfer plan",
      description: "Complete the detailed plan for transferring all TechStart assets",
      status: "open",
      priority: "medium",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 21)),
      assigneeId: 2,
      taskType: "internal" // Internal task
    };
    const techTaskId2 = this.currentTaskId++;
    const techTaskDate2 = new Date();
    const createdTechTask2: Task = {
      id: techTaskId2,
      dealId: techTask2.dealId,
      title: techTask2.title,
      description: techTask2.description,
      status: techTask2.status,
      priority: techTask2.priority,
      dueDate: techTask2.dueDate,
      assigneeId: techTask2.assigneeId,
      assigneeType: "user", // Internal task assigned to user
      taskType: techTask2.taskType || "internal", // Add taskType with default
      completed: false, // Adding required field
      createdAt: techTaskDate2,
      updatedAt: techTaskDate2,
      completedAt: null
    };
    this.tasks.set(techTaskId2, createdTechTask2);
    
    // Issues for TechStart deal
    const techIssue1: InsertIssue = {
      dealId: createdDeal2.id,
      title: "IP ownership question",
      description: "Need to clarify ownership of three pending patents",
      status: "open",
      priority: "high",
      assigneeId: 3
    };
    const techIssueId1 = this.currentIssueId++;
    const techIssueDate1 = new Date();
    const createdTechIssue1: Issue = {
      id: techIssueId1,
      dealId: techIssue1.dealId,
      title: techIssue1.title,
      description: techIssue1.description,
      status: techIssue1.status,
      priority: techIssue1.priority,
      assigneeId: techIssue1.assigneeId,
      createdAt: techIssueDate1,
      updatedAt: techIssueDate1
    };
    this.issues.set(techIssueId1, createdTechIssue1);
    
    // Deal Counsel for TechStart deal
    const techCounsel1: InsertDealCounsel = {
      dealId: createdDeal2.id,
      lawFirmId: createdFirm2.id,
      attorneyId: createdAttorney2.id,
      role: "Lead Counsel",
      notes: "Handling all acquisition documentation"
    };
    const techCounselId1 = this.currentDealCounselId++;
    const techCounselDate1 = new Date();
    const createdTechCounsel1: DealCounsel = {
      id: techCounselId1,
      dealId: techCounsel1.dealId,
      lawFirmId: techCounsel1.lawFirmId,
      attorneyId: techCounsel1.attorneyId,
      role: techCounsel1.role,
      notes: techCounsel1.notes,
      createdAt: techCounselDate1,
      updatedAt: techCounselDate1
    };
    this.dealCounsels.set(techCounselId1, createdTechCounsel1);
    
    // Timeline events for TechStart deal
    const techEvent1: InsertTimelineEvent = {
      dealId: createdDeal2.id,
      title: "Acquisition Agreement Drafted",
      description: "Initial draft of the acquisition agreement completed by legal team.",
      eventType: "document",
      referenceId: createdTechDoc1.id,
      referenceType: "document"
    };
    const techEventId1 = this.currentTimelineEventId++;
    const techEventDate1 = new Date();
    const createdTechEvent1: TimelineEvent = {
      id: techEventId1,
      dealId: techEvent1.dealId,
      title: techEvent1.title,
      description: techEvent1.description,
      eventType: techEvent1.eventType,
      createdAt: techEventDate1,
      referenceId: techEvent1.referenceId || null,
      referenceType: techEvent1.referenceType || null
    };
    this.timelineEvents.set(techEventId1, createdTechEvent1);
    
    const techEvent2: InsertTimelineEvent = {
      dealId: createdDeal2.id,
      title: "IP Issue Identified",
      description: "Legal team identified potential issues with patent ownership.",
      eventType: "issue",
      referenceId: createdTechIssue1.id,
      referenceType: "issue"
    };
    const techEventId2 = this.currentTimelineEventId++;
    const techEventDate2 = new Date();
    const createdTechEvent2: TimelineEvent = {
      id: techEventId2,
      dealId: techEvent2.dealId,
      title: techEvent2.title,
      description: techEvent2.description,
      eventType: techEvent2.eventType,
      createdAt: techEventDate2,
      referenceId: techEvent2.referenceId || null,
      referenceType: techEvent2.referenceType || null
    };
    this.timelineEvents.set(techEventId2, createdTechEvent2);
    
    // Add data for HealthTech Series A (Deal 3)
    // Documents for deal 3
    const healthDoc1: InsertDocument = {
      dealId: createdDeal3.id,
      title: "Series A Term Sheet",
      description: "Term sheet for the HealthTech Series A round",
      category: "Legal",
      status: "Draft",
      fileType: "docx",
      assigneeId: 1
    };
    const healthDocId1 = this.currentDocumentId++;
    const healthDoc1Date = new Date();
    const createdHealthDoc1: Document = {
      id: healthDocId1,
      dealId: healthDoc1.dealId,
      title: healthDoc1.title,
      description: healthDoc1.description,
      category: healthDoc1.category,
      status: healthDoc1.status,
      fileType: healthDoc1.fileType,
      assigneeId: healthDoc1.assigneeId,
      createdAt: healthDoc1Date,
      updatedAt: healthDoc1Date
    };
    this.documents.set(healthDocId1, createdHealthDoc1);
    
    const healthDoc2: InsertDocument = {
      dealId: createdDeal3.id,
      title: "Investor Presentation",
      description: "Pitch deck for Series A investors",
      category: "Financial",
      status: "Final",
      fileType: "pdf",
      assigneeId: 1
    };
    const healthDocId2 = this.currentDocumentId++;
    const healthDoc2Date = new Date();
    const createdHealthDoc2: Document = {
      id: healthDocId2,
      dealId: healthDoc2.dealId,
      title: healthDoc2.title,
      description: healthDoc2.description,
      category: healthDoc2.category,
      status: healthDoc2.status,
      fileType: healthDoc2.fileType,
      assigneeId: healthDoc2.assigneeId,
      createdAt: healthDoc2Date,
      updatedAt: healthDoc2Date
    };
    this.documents.set(healthDocId2, createdHealthDoc2);
    
    // Document versions for HealthTech deal
    const healthVersion1: InsertDocumentVersion = {
      documentId: healthDocId1,
      version: 1,
      fileName: "series-a-term-sheet-v1.docx",
      fileSize: 120000,
      fileType: "docx",
      uploadedById: 1,
      content: "This Term Sheet summarizes the principal terms of the Series A Preferred Stock Financing of HealthTech Solutions, Inc., a Delaware corporation (the \"Company\")..."
    };
    const healthVersionId1 = this.currentVersionId++;
    const healthVersionDate1 = new Date();
    const createdHealthVersion1: DocumentVersion = {
      id: healthVersionId1,
      documentId: healthVersion1.documentId,
      version: healthVersion1.version,
      fileName: healthVersion1.fileName,
      fileSize: healthVersion1.fileSize,
      fileType: healthVersion1.fileType,
      uploadedById: healthVersion1.uploadedById,
      content: healthVersion1.content,
      createdAt: healthVersionDate1
    };
    this.documentVersions.set(healthVersionId1, createdHealthVersion1);
    
    // Tasks for HealthTech deal
    const healthTask1: InsertTask = {
      dealId: createdDeal3.id,
      title: "Complete investors list",
      description: "Finalize the list of participating investors",
      status: "in-progress",
      priority: "high",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
      assigneeId: 1,
      taskType: "internal" // Internal task
    };
    const healthTaskId1 = this.currentTaskId++;
    const healthTaskDate1 = new Date();
    const createdHealthTask1: Task = {
      id: healthTaskId1,
      dealId: healthTask1.dealId,
      title: healthTask1.title,
      description: healthTask1.description,
      status: healthTask1.status,
      priority: healthTask1.priority,
      dueDate: healthTask1.dueDate,
      assigneeId: healthTask1.assigneeId,
      assigneeType: "user", // Internal task assigned to user
      taskType: healthTask1.taskType || "internal", // Add taskType with default
      completed: false, // Adding required field
      createdAt: healthTaskDate1,
      updatedAt: healthTaskDate1,
      completedAt: null
    };
    this.tasks.set(healthTaskId1, createdHealthTask1);
    
    const healthTask2: InsertTask = {
      dealId: createdDeal3.id,
      title: "Negotiate valuation cap",
      description: "Finalize terms for the valuation cap with lead investor",
      status: "open",
      priority: "urgent",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
      assigneeId: 1,
      taskType: "external" // External task
    };
    const healthTaskId2 = this.currentTaskId++;
    const healthTaskDate2 = new Date();
    const createdHealthTask2: Task = {
      id: healthTaskId2,
      dealId: healthTask2.dealId,
      title: healthTask2.title,
      description: healthTask2.description,
      status: healthTask2.status,
      priority: healthTask2.priority,
      dueDate: healthTask2.dueDate,
      assigneeId: healthTask2.assigneeId,
      assigneeType: "lawFirm", // External task assigned to law firm
      taskType: healthTask2.taskType || "external", // Add taskType with default
      completed: false, // Adding required field
      createdAt: healthTaskDate2,
      updatedAt: healthTaskDate2,
      completedAt: null
    };
    this.tasks.set(healthTaskId2, createdHealthTask2);
    
    // Issues for HealthTech deal
    const healthIssue1: InsertIssue = {
      dealId: createdDeal3.id,
      title: "Liquidation preference disagreement",
      description: "Lead investor requesting 2x liquidation preference, need to negotiate down",
      status: "open",
      priority: "high",
      assigneeId: 1
    };
    const healthIssueId1 = this.currentIssueId++;
    const healthIssueDate1 = new Date();
    const createdHealthIssue1: Issue = {
      id: healthIssueId1,
      dealId: healthIssue1.dealId,
      title: healthIssue1.title,
      description: healthIssue1.description,
      status: healthIssue1.status,
      priority: healthIssue1.priority,
      assigneeId: healthIssue1.assigneeId,
      createdAt: healthIssueDate1,
      updatedAt: healthIssueDate1
    };
    this.issues.set(healthIssueId1, createdHealthIssue1);
    
    // Deal Counsel for HealthTech deal
    const healthCounsel1: InsertDealCounsel = {
      dealId: createdDeal3.id,
      lawFirmId: createdFirm1.id,
      attorneyId: createdAttorney1.id,
      role: "Lead Counsel",
      notes: "Handling all Series A documentation"
    };
    const healthCounselId1 = this.currentDealCounselId++;
    const healthCounselDate1 = new Date();
    const createdHealthCounsel1: DealCounsel = {
      id: healthCounselId1,
      dealId: healthCounsel1.dealId,
      lawFirmId: healthCounsel1.lawFirmId,
      attorneyId: healthCounsel1.attorneyId,
      role: healthCounsel1.role,
      notes: healthCounsel1.notes,
      createdAt: healthCounselDate1,
      updatedAt: healthCounselDate1
    };
    this.dealCounsels.set(healthCounselId1, createdHealthCounsel1);
    
    // Timeline events for HealthTech deal
    const healthEvent1: InsertTimelineEvent = {
      dealId: createdDeal3.id,
      title: "Term Sheet Drafted",
      description: "Initial draft of the Series A term sheet completed",
      eventType: "document",
      referenceId: createdHealthDoc1.id,
      referenceType: "document"
    };
    const healthEventId1 = this.currentTimelineEventId++;
    const healthEventDate1 = new Date();
    const createdHealthEvent1: TimelineEvent = {
      id: healthEventId1,
      dealId: healthEvent1.dealId,
      title: healthEvent1.title,
      description: healthEvent1.description,
      eventType: healthEvent1.eventType,
      createdAt: healthEventDate1,
      referenceId: healthEvent1.referenceId || null,
      referenceType: healthEvent1.referenceType || null
    };
    this.timelineEvents.set(healthEventId1, createdHealthEvent1);
    
    const healthEvent2: InsertTimelineEvent = {
      dealId: createdDeal3.id,
      title: "Lead Investor Commitment",
      description: "Received formal commitment from lead investor for $5M",
      eventType: "milestone",
      referenceId: null,
      referenceType: null
    };
    const healthEventId2 = this.currentTimelineEventId++;
    const healthEventDate2 = new Date();
    const createdHealthEvent2: TimelineEvent = {
      id: healthEventId2,
      dealId: healthEvent2.dealId,
      title: healthEvent2.title,
      description: healthEvent2.description,
      eventType: healthEvent2.eventType,
      createdAt: healthEventDate2,
      referenceId: healthEvent2.referenceId || null,
      referenceType: healthEvent2.referenceType || null
    };
    this.timelineEvents.set(healthEventId2, createdHealthEvent2);
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

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.currentCompanyId++;
    const now = new Date();
    const company: Company = {
      ...insertCompany,
      id,
      createdAt: now,
      updatedAt: now,
      url: insertCompany.url || null,
      bcvTeam: Array.isArray(insertCompany.bcvTeam) ? insertCompany.bcvTeam : []
    };
    this.companies.set(id, company);
    return company;
  }

  async updateCompany(id: number, companyUpdate: Partial<InsertCompany>): Promise<Company | undefined> {
    const company = await this.getCompany(id);
    if (!company) return undefined;

    // Handle bcvTeam explicitly to ensure proper typing
    const bcvTeam = companyUpdate.bcvTeam !== undefined 
      ? (Array.isArray(companyUpdate.bcvTeam) ? companyUpdate.bcvTeam : []) 
      : company.bcvTeam;

    const updatedCompany: Company = {
      ...company,
      ...companyUpdate,
      id,
      updatedAt: new Date(),
      bcvTeam
    };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  async deleteCompany(id: number): Promise<boolean> {
    // First check if any deals are using this company
    const deals = await this.getDeals();
    const associatedDeals = deals.filter(deal => deal.companyId === id);
    
    if (associatedDeals.length > 0) {
      // Cannot delete a company that is still being used
      return false;
    }
    
    return this.companies.delete(id);
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
    console.log('updateDeal called with id:', id, 'and update data:', JSON.stringify(dealUpdate));
    
    const existingDeal = this.deals.get(id);
    if (!existingDeal) {
      console.log('Deal not found with id:', id);
      return undefined;
    }
    
    // Process companyId specifically
    let processedDealUpdate = { ...dealUpdate };
    
    // Ensure companyId is a number
    if (dealUpdate.companyId !== undefined) {
      const companyId = typeof dealUpdate.companyId === 'string'
        ? parseInt(dealUpdate.companyId)
        : dealUpdate.companyId;
      
      // If we have a valid companyId, get the company info
      const company = this.companies.get(companyId);
      
      console.log('Processing companyId:', companyId, 'Found company:', company ? 'Yes' : 'No');
      
      // Update both companyId and companyName if we have a valid company
      if (company) {
        processedDealUpdate = {
          ...processedDealUpdate,
          companyId: companyId,
          companyName: company.displayName
        };
      }
    }
    
    console.log('Processed deal update:', JSON.stringify(processedDealUpdate));
    
    const updatedDeal: Deal = { 
      ...existingDeal, 
      ...processedDealUpdate, 
      updatedAt: new Date() 
    };
    
    console.log('Final updated deal:', JSON.stringify(updatedDeal));
    
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
  
  async updateDealTeam(dealId: number, teamMembers: InsertDealUser[]): Promise<DealUser[]> {
    // First, remove all existing team members for this deal
    const dealUserIds: number[] = [];
    this.dealUsers.forEach((dealUser, id) => {
      if (dealUser.dealId === dealId) {
        dealUserIds.push(id);
      }
    });
    
    dealUserIds.forEach(id => {
      this.dealUsers.delete(id);
    });
    
    // Then add all new team members
    const newTeamMembers: DealUser[] = [];
    for (const member of teamMembers) {
      const newMember = await this.addUserToDeal(member);
      newTeamMembers.push(newMember);
    }
    
    return newTeamMembers;
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
    // Use the already imported generateDocumentComparison function
    
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

  async getTasksByDeal(dealId: number): Promise<(Task & { assignee?: User | Attorney | LawFirm | { name: string, type: 'custom', initials: string, avatarColor: string } })[]> {
    const dealTasks = Array.from(this.tasks.values())
      .filter((task) => task.dealId === dealId);
    
    return dealTasks.map(task => {
      // For tasks without an assignee
      if (!task.assigneeId && !task.assigneeName) {
        return { ...task, assignee: undefined };
      }
      
      // Custom assignee (just a name string, not linked to a DB entity)
      if (task.assigneeType === 'custom' && task.assigneeName) {
        // Create a virtual assignee object with name and initials for display
        const nameParts = task.assigneeName.split(' ');
        const initials = nameParts.length > 1 
          ? `${nameParts[0][0] || ''}${nameParts[1][0] || ''}`.toUpperCase() 
          : `${nameParts[0][0] || ''}${nameParts[0][1] || ''}`.toUpperCase();
        
        return { 
          ...task, 
          assignee: {
            name: task.assigneeName,
            type: 'custom',
            initials,
            avatarColor: '#94A3B8' // Slate-400 color for custom assignees
          }
        };
      }
      
      // User assignee
      if (task.assigneeType === 'user' && task.assigneeId) {
        const assignee = this.users.get(task.assigneeId);
        if (!assignee) {
          return { ...task, assignee: undefined };
        }
        
        return { ...task, assignee };
      }
      
      // Attorney assignee
      if (task.assigneeType === 'attorney' && task.assigneeId) {
        const assignee = this.attorneys.get(task.assigneeId);
        if (!assignee) {
          return { ...task, assignee: undefined };
        }
        
        // Return attorney with custom initials and avatar color
        return { 
          ...task, 
          assignee: {
            ...assignee,
            initials: 'AT', // Attorney
            avatarColor: '#8B5CF6' // Purple-500 for external assignees
          }
        };
      }
      
      // Law firm assignee
      if (task.assigneeType === 'firm' && task.assigneeId) {
        const assignee = this.lawFirms.get(task.assigneeId);
        if (!assignee) {
          return { ...task, assignee: undefined };
        }
        
        // Return law firm with custom initials and avatar color
        return { 
          ...task, 
          assignee: {
            ...assignee,
            initials: 'LF', // Law Firm
            avatarColor: '#8B5CF6' // Purple-500 for external assignees
          }
        };
      }
      
      // Fallback for any other case
      return { ...task, assignee: undefined };
    });
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    console.log(`[Storage] Creating new task with data:`, JSON.stringify(insertTask, null, 2));
    
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
      assigneeType: insertTask.assigneeType || 'user', // Handle assignee type (user, attorney, firm, custom)
      assigneeName: insertTask.assigneeName || null, // Store name for custom assignees
      taskType: insertTask.taskType || 'internal', // Handle task type (internal or external)
      completed: insertTask.completed || false,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check for custom assignee values and log them
    if (task.assigneeType === 'custom') {
      console.log(`[Storage] Custom assignee detected with name: "${task.assigneeName}"`);
      if (!task.assigneeName) {
        console.warn(`[Storage] Warning: Custom assignee has no name specified!`);
      }
    }
    
    console.log(`[Storage] Saving new task:`, JSON.stringify(task, null, 2));
    this.tasks.set(id, task);
    console.log(`[Storage] Task saved successfully with ID: ${id}`);
    
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
    console.log(`[Storage] Updating task with ID: ${id}`);
    console.log(`[Storage] Update data:`, JSON.stringify(taskUpdate, null, 2));
    
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      console.log(`[Storage] Task with ID ${id} not found`);
      return undefined;
    }
    
    console.log(`[Storage] Found existing task:`, JSON.stringify(existingTask, null, 2));
    
    // Ensure assigneeType is set appropriately based on taskType
    if (taskUpdate.taskType && !taskUpdate.assigneeType) {
      if (taskUpdate.taskType === 'external') {
        // Default to 'attorney' if external task with no assigneeType specified
        taskUpdate.assigneeType = 'attorney';
        console.log(`[Storage] Setting assigneeType to 'attorney' for external task`);
      } else {
        // Default to 'user' if internal task with no assigneeType specified
        taskUpdate.assigneeType = 'user';
        console.log(`[Storage] Setting assigneeType to 'user' for internal task`);
      }
    }
    
    // Special handling for custom assignees
    if (taskUpdate.assigneeType === 'custom' && !taskUpdate.assigneeName) {
      // For custom assignee type, we need to ensure a name is provided
      if (existingTask.assigneeType === 'custom' && existingTask.assigneeName) {
        // Keep existing custom assignee name if not provided in update
        taskUpdate.assigneeName = existingTask.assigneeName;
        console.log(`[Storage] Keeping existing custom assignee name: ${taskUpdate.assigneeName}`);
      }
    }
    
    // For non-custom assignees, clear assigneeName
    if (taskUpdate.assigneeType && taskUpdate.assigneeType !== 'custom') {
      taskUpdate.assigneeName = null;
      console.log(`[Storage] Clearing assigneeName for non-custom assignee type: ${taskUpdate.assigneeType}`);
    }
    
    const updatedTask: Task = { 
      ...existingTask, 
      ...taskUpdate,
      updatedAt: new Date() // Always update the updatedAt timestamp
    };
    
    console.log(`[Storage] Updated task object before saving:`, JSON.stringify(updatedTask, null, 2));
    
    // Verify assignee information is properly set
    if (updatedTask.assigneeType === 'custom') {
      console.log(`[Storage] Custom assignee detected. Name: ${updatedTask.assigneeName}`);
      if (!updatedTask.assigneeName) {
        console.warn(`[Storage] Warning: Custom assignee type but no assigneeName set!`);
      }
    } else {
      console.log(`[Storage] Non-custom assignee type: ${updatedTask.assigneeType}, ID: ${updatedTask.assigneeId}`);
    }
    
    this.tasks.set(id, updatedTask);
    console.log(`[Storage] Task saved successfully with ID: ${id}`);
    
    // Create timeline event if task type changed
    if (taskUpdate.taskType && taskUpdate.taskType !== existingTask.taskType) {
      console.log(`[Storage] Creating timeline event for task type change: ${existingTask.taskType} -> ${updatedTask.taskType}`);
      this.createTimelineEvent({
        dealId: updatedTask.dealId,
        title: "Task Type Changed",
        description: `Task "${updatedTask.title}" changed from ${existingTask.taskType} to ${updatedTask.taskType}`,
        eventType: "task",
        referenceId: id,
        referenceType: "task"
      });
    }
    
    // Create timeline event if assignee type changed
    if (taskUpdate.assigneeType && taskUpdate.assigneeType !== existingTask.assigneeType) {
      console.log(`[Storage] Creating timeline event for assignee type change: ${existingTask.assigneeType} -> ${updatedTask.assigneeType}`);
      this.createTimelineEvent({
        dealId: updatedTask.dealId,
        title: "Assignee Type Changed",
        description: `Task "${updatedTask.title}" assignee type changed from ${existingTask.assigneeType} to ${updatedTask.assigneeType}`,
        eventType: "task",
        referenceId: id,
        referenceType: "task"
      });
    }
    
    console.log(`[Storage] Task update completed. Returning updated task.`);
    return updatedTask;
  }

  async completeTask(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }
    
    const now = new Date();
    const completedTask: Task = { 
      ...task, 
      completed: true, 
      completedAt: now,
      updatedAt: now 
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
  
  async getAttorneys(): Promise<Attorney[]> {
    return Array.from(this.attorneys.values());
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

  // App Settings methods
  async getAppSettings(): Promise<AppSetting[]> {
    return Array.from(this.appSettings.values());
  }

  async getAppSettingByKey(key: string): Promise<AppSetting | undefined> {
    for (const setting of this.appSettings.values()) {
      if (setting.key === key) {
        return setting;
      }
    }
    return undefined;
  }

  async createAppSetting(settingInsert: InsertAppSetting): Promise<AppSetting> {
    // Check if a setting with this key already exists
    const existingSetting = await this.getAppSettingByKey(settingInsert.key);
    if (existingSetting) {
      // If it exists, update it instead
      const updatedSetting: AppSetting = {
        ...existingSetting,
        value: settingInsert.value,
        updatedAt: new Date()
      };
      this.appSettings.set(existingSetting.id, updatedSetting);
      return updatedSetting;
    }

    // Create a new setting
    const id = this.currentAppSettingId++;
    const now = new Date();
    const setting: AppSetting = {
      ...settingInsert,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.appSettings.set(id, setting);
    return setting;
  }

  async updateAppSetting(id: number, settingUpdate: Partial<InsertAppSetting>): Promise<AppSetting | undefined> {
    const existingSetting = this.appSettings.get(id);
    if (!existingSetting) {
      return undefined;
    }
    
    const updatedSetting: AppSetting = {
      ...existingSetting,
      ...settingUpdate,
      updatedAt: new Date()
    };
    this.appSettings.set(id, updatedSetting);
    return updatedSetting;
  }

  async deleteAppSetting(id: number): Promise<boolean> {
    return this.appSettings.delete(id);
  }

  // Funds
  async getFunds(): Promise<Fund[]> {
    return Array.from(this.funds.values());
  }

  async getFund(id: number): Promise<Fund | undefined> {
    return this.funds.get(id);
  }

  async createFund(fund: InsertFund): Promise<Fund> {
    const id = this.currentFundId++;
    const now = new Date();
    const created: Fund = {
      ...fund,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.funds.set(id, created);
    return created;
  }

  async updateFund(id: number, fund: Partial<InsertFund>): Promise<Fund | undefined> {
    const existing = this.funds.get(id);
    if (!existing) {
      return undefined;
    }
    const updated: Fund = {
      ...existing,
      ...fund,
      updatedAt: new Date()
    };
    this.funds.set(id, updated);
    return updated;
  }

  async deleteFund(id: number): Promise<boolean> {
    return this.funds.delete(id);
  }

  // Allocations
  async getAllocations(dealId: number): Promise<(Allocation & { fund: Fund })[]> {
    const allocations: (Allocation & { fund: Fund })[] = [];
    for (const allocation of this.allocations.values()) {
      if (allocation.dealId === dealId) {
        const fund = this.funds.get(allocation.fundId);
        if (fund) {
          allocations.push({
            ...allocation,
            fund
          });
        }
      }
    }
    return allocations;
  }

  async getAllocation(id: number): Promise<Allocation | undefined> {
    return this.allocations.get(id);
  }

  async createAllocation(allocation: InsertAllocation): Promise<Allocation> {
    const id = this.currentAllocationId++;
    const now = new Date();
    const created: Allocation = {
      ...allocation,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.allocations.set(id, created);
    return created;
  }

  async updateAllocation(id: number, allocation: Partial<InsertAllocation>): Promise<Allocation | undefined> {
    const existing = this.allocations.get(id);
    if (!existing) {
      return undefined;
    }
    const updated: Allocation = {
      ...existing,
      ...allocation,
      updatedAt: new Date()
    };
    this.allocations.set(id, updated);
    return updated;
  }

  async deleteAllocation(id: number): Promise<boolean> {
    return this.allocations.delete(id);
  }
}

export const storage = new MemStorage();