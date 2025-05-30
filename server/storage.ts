import {
  users, User, InsertUser,
  companies, Company, InsertCompany,
  deals, Deal, InsertDeal,
  dealUsers, DealUser, InsertDealUser,
  documents, Document, InsertDocument,
  documentVersions, DocumentVersion, InsertDocumentVersion,
  issues, Issue, InsertIssue,
  lawFirms, LawFirm, InsertLawFirm,
  attorneys, Attorney, InsertAttorney, 
  dealCounsels, DealCounsel, InsertDealCounsel,
  timelineEvents, TimelineEvent, InsertTimelineEvent,
  appSettings, AppSetting, InsertAppSetting,
  funds, Fund, InsertFund,
  allocations, Allocation, InsertAllocation,
  tasks, Task, InsertTask,
  customAssignees, CustomAssignee, InsertCustomAssignee,
  closingChecklist, ClosingChecklistItem, InsertClosingChecklistItem
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
  updateAttorney(id: number, attorney: Partial<Attorney>): Promise<Attorney | undefined>;
  deleteAttorney(id: number): Promise<boolean>;

  // Deal Counsels
  getDealCounsel(id: number): Promise<DealCounsel | undefined>;
  getDealCounsels(dealId: number): Promise<(DealCounsel & { lawFirm: LawFirm, attorney?: Attorney })[]>;
  getDealsByLawFirm(lawFirmId: number): Promise<Deal[]>;
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
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasksByDeal(dealId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Custom Assignees
  getCustomAssignees(): Promise<CustomAssignee[]>;
  getCustomAssignee(id: number): Promise<CustomAssignee | undefined>;
  createCustomAssignee(customAssignee: InsertCustomAssignee): Promise<CustomAssignee>;
  updateCustomAssignee(id: number, customAssignee: Partial<InsertCustomAssignee>): Promise<CustomAssignee | undefined>;
  deleteCustomAssignee(id: number): Promise<boolean>;
  deleteUnusedCustomAssignees(): Promise<boolean>;
  
  // Closing Checklist
  getClosingChecklistItem(id: number): Promise<ClosingChecklistItem | undefined>;
  getClosingChecklistByDeal(dealId: number): Promise<ClosingChecklistItem[]>;
  createClosingChecklistItem(item: InsertClosingChecklistItem): Promise<ClosingChecklistItem>;
  updateClosingChecklistItem(id: number, item: Partial<InsertClosingChecklistItem>): Promise<ClosingChecklistItem | undefined>;
  deleteClosingChecklistItem(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private deals: Map<number, Deal>;
  private dealUsers: Map<number, DealUser>;
  private documents: Map<number, Document>;
  private documentVersions: Map<number, DocumentVersion>;

  private issues: Map<number, Issue>;
  private lawFirms: Map<number, LawFirm>;
  private attorneys: Map<number, Attorney>;
  private dealCounsels: Map<number, DealCounsel>;
  private timelineEvents: Map<number, TimelineEvent>;
  private appSettings: Map<number, AppSetting>;
  private funds: Map<number, Fund>;
  private allocations: Map<number, Allocation>;
  private tasks: Map<number, Task>;
  private customAssignees: Map<number, CustomAssignee>;
  private closingChecklist: Map<number, ClosingChecklistItem>;


  currentUserId: number;
  currentCompanyId: number;
  currentDealId: number;
  currentDealUserId: number;
  currentDocumentId: number;
  currentVersionId: number;
  currentIssueId: number;
  currentLawFirmId: number;
  currentAttorneyId: number;
  currentDealCounselId: number;
  currentTimelineEventId: number;
  currentAppSettingId: number;
  currentFundId: number;
  currentAllocationId: number;
  currentTaskId: number;
  currentCustomAssigneeId: number;
  currentClosingChecklistItemId: number;
  


  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.deals = new Map();
    this.dealUsers = new Map();
    this.documents = new Map();
    this.documentVersions = new Map();
    this.issues = new Map();
    this.lawFirms = new Map();
    this.attorneys = new Map();
    this.dealCounsels = new Map();
    this.timelineEvents = new Map();
    this.appSettings = new Map();
    this.funds = new Map();
    this.allocations = new Map();
    this.tasks = new Map();
    this.customAssignees = new Map();
    this.closingChecklist = new Map();
    


    this.currentUserId = 1;
    this.currentCompanyId = 1;
    this.currentDealId = 1;
    this.currentDealUserId = 1;
    this.currentDocumentId = 1;
    this.currentVersionId = 1;
    this.currentIssueId = 1;
    this.currentLawFirmId = 1;
    this.currentAttorneyId = 1;
    this.currentDealCounselId = 1;
    this.currentTimelineEventId = 1;
    this.currentAppSettingId = 1;
    this.currentFundId = 1;
    this.currentAllocationId = 1;
    this.currentTaskId = 1;
    this.currentCustomAssigneeId = 1;
    this.currentClosingChecklistItemId = 1;
    


    // Initialize with sample data
    this.initializeSampleData();
  }

  // Helper method to get realistic attorney headshots
  private getAttorneyHeadshot(name: string): string {
    // For female attorneys
    if (name.toLowerCase().includes('rachel')) {
      return "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('jodie')) {
      return "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('heidi')) {
      return "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('cindy')) {
      return "https://images.unsplash.com/photo-1607746882042-944635dfe10e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('fiona')) {
      return "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } 
    // For male attorneys
    else if (name.toLowerCase().includes('michael')) {
      return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('david')) {
      return "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('mark')) {
      return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('ivan')) {
      return "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('samuel')) {
      return "https://images.unsplash.com/photo-1560787313-5dff3307e257?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('greg')) {
      return "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('james')) {
      return "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('ted')) {
      return "https://images.unsplash.com/photo-1541647376583-8934aaf3448a?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    } else if (name.toLowerCase().includes('john')) {
      return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
    }
    
    // Default fallback headshots based on gender patterns in name
    return name.toLowerCase().includes('a') && name.endsWith('a') || 
           name.toLowerCase().includes('elle') || 
           name.toLowerCase().includes('ina') ||
           name.toLowerCase().includes('rie') ?
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80" : 
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80";
  }

  // Initialize with sample data to have a working app on start
  private initializeSampleData() {
    console.log("DEBUG - Initializing sample data");

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
    
    // Initialize sample tasks and closing checklist items
    this.initializeTasksAndChecklists();
    
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

    // Create law firms - real firms that specialize in emerging companies and venture capital
    const lawFirms: InsertLawFirm[] = [
      {
        name: "Cooley LLP",
        specialty: "Emerging Companies & Venture Capital",
        email: "info@cooley.com",
        phone: "650-843-5000"
      },
      {
        name: "Wilson Sonsini Goodrich & Rosati",
        specialty: "Corporate & Securities Law",
        email: "info@wsgr.com",
        phone: "650-493-9300"
      },
      {
        name: "Gunderson Dettmer",
        specialty: "Venture Capital & Emerging Companies",
        email: "info@gunder.com",
        phone: "650-321-2400"
      },
      {
        name: "Fenwick & West LLP",
        specialty: "Technology & Life Sciences",
        email: "info@fenwick.com",
        phone: "650-988-8500"
      },
      {
        name: "Latham & Watkins LLP",
        specialty: "Corporate & Capital Markets",
        email: "info@lw.com",
        phone: "212-906-1200"
      },
      {
        name: "Orrick, Herrington & Sutcliffe",
        specialty: "Technology Companies Group",
        email: "info@orrick.com",
        phone: "415-773-5700"
      },
      {
        name: "Goodwin Procter LLP",
        specialty: "Technology & Life Sciences",
        email: "info@goodwinlaw.com",
        phone: "617-570-1000"
      },
      {
        name: "Perkins Coie LLP",
        specialty: "Emerging Companies & Venture Capital",
        email: "startups@perkinscoie.com",
        phone: "206-359-8000"
      },
      {
        name: "Morrison & Foerster LLP",
        specialty: "Corporate Finance",
        email: "info@mofo.com",
        phone: "415-268-7000"
      },
      {
        name: "DLA Piper",
        specialty: "Emerging Growth & Venture Capital",
        email: "info@dlapiper.com",
        phone: "650-833-2000"
      }
    ];

    // Create firms directly for sample data
    const createdFirms: {[key: string]: LawFirm} = {};
    
    for (const firm of lawFirms) {
      const firmId = this.currentLawFirmId++;
      const createdFirm: LawFirm = { 
        ...firm, 
        id: firmId, 
        createdAt: new Date(),
        email: firm.email || null,
        phone: firm.phone || null 
      };
      this.lawFirms.set(firmId, createdFirm);
      createdFirms[firm.name] = createdFirm;
    }

    // Create attorneys - real attorneys from top law firms
    const attorneys: {[key: string]: InsertAttorney[]} = {
      "Cooley LLP": [
        {
          name: "Michael Platt",
          position: "Partner",
          email: "mplatt@cooley.com",
          phone: "650-843-5059",
          initials: "MP",
          avatarColor: "#9333ea", // purple-600
          photoUrl: "https://www.cooley.com/-/media/cooley/attorneys/platt-michael.jpg"
        },
        {
          name: "Rachel Proffitt",
          position: "Partner",
          email: "rproffitt@cooley.com",
          phone: "415-693-2031",
          initials: "RP",
          avatarColor: "#22c55e", // green-600
          photoUrl: "https://www.cooley.com/-/media/cooley/attorneys/proffitt-rachel.jpg"
        },
        {
          name: "Jodie Bourdet",
          position: "Partner",
          email: "jbourdet@cooley.com",
          phone: "415-693-2054",
          initials: "JB",
          avatarColor: "#2563eb", // blue-600
          photoUrl: "https://www.cooley.com/-/media/cooley/attorneys/bourdet-jodie.jpg"
        }
      ],
      "Wilson Sonsini Goodrich & Rosati": [
        {
          name: "David Segre",
          position: "Partner",
          email: "dsegre@wsgr.com",
          phone: "650-565-3517",
          initials: "DS",
          avatarColor: "#71717a", // gray-600
          photoUrl: "https://cdn.wilsonsonsini.com/content/uploads/2020/06/headshot-david-segre.jpg"
        },
        {
          name: "Mark Baudler",
          position: "Partner",
          email: "mbaudler@wsgr.com",
          phone: "650-320-4508",
          initials: "MB",
          avatarColor: "#ea580c", // orange-600
          photoUrl: "https://cdn.wilsonsonsini.com/content/uploads/2020/06/headshot-mark-baudler.jpg"
        }
      ],
      "Gunderson Dettmer": [
        {
          name: "Ivan Gaviria",
          position: "Partner",
          email: "igaviria@gunder.com",
          phone: "650-463-5267",
          initials: "IG",
          avatarColor: "#0284c7", // sky-600
          photoUrl: "https://www.gunder.com/wp-content/uploads/2023/10/Ivan-Gaviria-Photo-Oct-2023-square-400x400.jpg"
        },
        {
          name: "Heidi Walas",
          position: "Partner",
          email: "hwalas@gunder.com",
          phone: "650-463-5052",
          initials: "HW",
          avatarColor: "#db2777", // pink-600
          photoUrl: "https://www.gunder.com/wp-content/uploads/2022/11/Heidi-Walas-Photo-Nov-2022-square-400x400.jpg"
        }
      ],
      "Fenwick & West LLP": [
        {
          name: "Samuel Angus",
          position: "Partner",
          email: "sangus@fenwick.com",
          phone: "415-875-2300",
          initials: "SA",
          avatarColor: "#7c3aed", // violet-600
          photoUrl: "https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2023-06/samangus.jpg"
        },
        {
          name: "Cindy Hess",
          position: "Partner",
          email: "chess@fenwick.com",
          phone: "650-335-7177",
          initials: "CH",
          avatarColor: "#c2410c", // amber-700
          photoUrl: "https://www.fenwick.com/sites/default/files/styles/individual_page_photo/public/2021-11/CindyHess.jpg"
        }
      ],
      "Latham & Watkins LLP": [
        {
          name: "Benjamin Potter",
          position: "Partner",
          email: "benjamin.potter@lw.com",
          phone: "202-637-2237",
          initials: "BP",
          avatarColor: "#0f766e", // teal-700
          photoUrl: "https://www.lw.com/cdn/MDAwMDAwMDAwMDAwLzAvYy8v/ce5cIm/a-benjamin-potter.jpg"
        }
      ],
      "Orrick, Herrington & Sutcliffe": [
        {
          name: "John Bautista",
          position: "Partner",
          email: "jbautista@orrick.com",
          phone: "415-773-5469",
          initials: "JB",
          avatarColor: "#9f1239", // rose-800
          photoUrl: "https://www.orrick.com/-/media/images/people/b/john-bautista.jpg"
        },
        {
          name: "Harold Yu",
          position: "Partner",
          email: "hyu@orrick.com",
          phone: "415-773-5987",
          initials: "HY",
          avatarColor: "#4338ca", // indigo-700
          photoUrl: "https://www.orrick.com/-/media/images/people/y/harold-yu.jpg"
        }
      ],
      "Goodwin Procter LLP": [
        {
          name: "Anthony McCusker",
          position: "Partner",
          email: "amccusker@goodwinlaw.com",
          phone: "650-752-3267",
          initials: "AM",
          avatarColor: "#1e3a8a", // blue-900
          photoUrl: "https://www.goodwinlaw.com/-/media/images/people/m/mccusker-anthony.jpg"
        }
      ],
      "Perkins Coie LLP": [
        {
          name: "Fiona Brophy",
          position: "Partner",
          email: "fbrophy@perkinscoie.com",
          phone: "415-344-7050",
          initials: "FB",
          avatarColor: "#365314", // lime-900
          photoUrl: "https://www.perkinscoie.com/images/content/7/2/v2/72178/Brophy-Fiona-hs-2023.jpg"
        }
      ],
      "Morrison & Foerster LLP": [
        {
          name: "Timothy Harris",
          position: "Partner",
          email: "tharris@mofo.com",
          phone: "415-268-6180",
          initials: "TH",
          avatarColor: "#7f1d1d", // red-900
          photoUrl: "https://media.mofo.com/images/content/7/4/74909.jpg"
        }
      ],
      "DLA Piper": [
        {
          name: "Curtis Mo",
          position: "Partner",
          email: "curtis.mo@dlapiper.com",
          phone: "650-833-2000",
          initials: "CM",
          avatarColor: "#0f172a", // slate-900
          photoUrl: "https://www.dlapiper.com/sites/default/files/vcard/2022-10/curtis-mo-650-833-2141.jpg"
        },
        {
          name: "Louis Lehot",
          position: "Partner",
          email: "louis.lehot@dlapiper.com",
          phone: "650-833-2300",
          initials: "LL",
          avatarColor: "#57534e", // stone-600
          photoUrl: "https://www.dlapiper.com/sites/default/files/vcard/2022-10/louis-lehot-650-833-2341.jpg"
        }
      ]
    };

    // Create attorneys directly for sample data
    const createdAttorneys: {[key: string]: Attorney} = {};
    
    // For each law firm, create the associated attorneys
    for (const firmName in attorneys) {
      if (attorneys.hasOwnProperty(firmName) && createdFirms[firmName]) {
        const firmAttorneys = attorneys[firmName];
        const lawFirmId = createdFirms[firmName].id;
        
        for (const attorney of firmAttorneys) {
          const attorneyId = this.currentAttorneyId++;
          const createdAttorney: Attorney = { 
            ...attorney, 
            lawFirmId,
            id: attorneyId, 
            createdAt: new Date(),
            phone: attorney.phone || null,
            mobile: attorney.mobile || null,
            photoUrl: attorney.photoUrl || this.getAttorneyHeadshot(attorney.name)
          };
          this.attorneys.set(attorneyId, createdAttorney);
          createdAttorneys[attorney.name] = createdAttorney;
        }
      }
    }
    
    // Store references to first two attorneys for use in deal assignments
    const createdAttorney1 = createdAttorneys["Michael Platt"];
    const createdAttorney2 = createdAttorneys["Ivan Gaviria"];

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
    
    const company4: InsertCompany = {
      legalName: "NanoTech Industries Ltd.",
      displayName: "NanoTech",
      url: "https://nanotechindustries.com",
      bcvTeam: ["Alice Rodriguez", "Tom Wilson"]
    };
    
    const company5: InsertCompany = {
      legalName: "Quantum Computing Systems",
      displayName: "QuantumCS",
      url: "https://quantumcs.tech",
      bcvTeam: ["Nina Chen", "Robert Jones"]
    };
    
    const company6: InsertCompany = {
      legalName: "Sustainable Energy Partners",
      displayName: "SustainEnergy",
      url: "https://sustainenergy.org",
      bcvTeam: ["Maria Santos", "John Davis"]
    };
    
    const company7: InsertCompany = {
      legalName: "Digital Finance Technologies",
      displayName: "DigiFin",
      url: "https://digifin.io",
      bcvTeam: ["Alex Morgan", "Sophie Kim"]
    };
    
    const company8: InsertCompany = {
      legalName: "BioMedical Research Labs",
      displayName: "BioMed Labs",
      url: "https://biomedlabs.org",
      bcvTeam: ["Daniel Park", "Emma Wilson"]
    };

    const company9: InsertCompany = {
      legalName: "SpaceTech Innovations",
      displayName: "SpaceTech",
      url: "https://spacetech.io",
      bcvTeam: ["Sam Rivera", "Julia Chen"]
    };

    const company10: InsertCompany = {
      legalName: "Advanced Robotics Inc.",
      displayName: "ARobotics",
      url: "https://arobotics.com",
      bcvTeam: ["Chris Taylor", "Michelle Lee"]
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
    
    // Create additional companies (4-10)
    const companyId4 = this.currentCompanyId++;
    const createdCompany4: Company = {
      ...company4,
      id: companyId4,
      createdAt: now4,
      updatedAt: now4,
      url: company4.url || null,
      bcvTeam: Array.isArray(company4.bcvTeam) ? company4.bcvTeam : []
    };
    this.companies.set(companyId4, createdCompany4);
    
    const companyId5 = this.currentCompanyId++;
    const createdCompany5: Company = {
      ...company5,
      id: companyId5,
      createdAt: now4,
      updatedAt: now4,
      url: company5.url || null,
      bcvTeam: Array.isArray(company5.bcvTeam) ? company5.bcvTeam : []
    };
    this.companies.set(companyId5, createdCompany5);
    
    const companyId6 = this.currentCompanyId++;
    const createdCompany6: Company = {
      ...company6,
      id: companyId6,
      createdAt: now4,
      updatedAt: now4,
      url: company6.url || null,
      bcvTeam: Array.isArray(company6.bcvTeam) ? company6.bcvTeam : []
    };
    this.companies.set(companyId6, createdCompany6);
    
    const companyId7 = this.currentCompanyId++;
    const createdCompany7: Company = {
      ...company7,
      id: companyId7,
      createdAt: now4,
      updatedAt: now4,
      url: company7.url || null,
      bcvTeam: Array.isArray(company7.bcvTeam) ? company7.bcvTeam : []
    };
    this.companies.set(companyId7, createdCompany7);
    
    const companyId8 = this.currentCompanyId++;
    const createdCompany8: Company = {
      ...company8,
      id: companyId8,
      createdAt: now4,
      updatedAt: now4,
      url: company8.url || null,
      bcvTeam: Array.isArray(company8.bcvTeam) ? company8.bcvTeam : []
    };
    this.companies.set(companyId8, createdCompany8);
    
    const companyId9 = this.currentCompanyId++;
    const createdCompany9: Company = {
      ...company9,
      id: companyId9,
      createdAt: now4,
      updatedAt: now4,
      url: company9.url || null,
      bcvTeam: Array.isArray(company9.bcvTeam) ? company9.bcvTeam : []
    };
    this.companies.set(companyId9, createdCompany9);
    
    const companyId10 = this.currentCompanyId++;
    const createdCompany10: Company = {
      ...company10,
      id: companyId10,
      createdAt: now4,
      updatedAt: now4,
      url: company10.url || null,
      bcvTeam: Array.isArray(company10.bcvTeam) ? company10.bcvTeam : []
    };
    this.companies.set(companyId10, createdCompany10);
    
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
      lawFirmId: createdFirms["Cooley LLP"].id, 
      attorneyId: createdAttorneys["Michael Platt"].id, 
      role: "Lead Counsel" 
    });
    
    this.createDealCounsel({ 
      dealId: createdDeal1.id, 
      lawFirmId: createdFirms["Gunderson Dettmer"].id, 
      attorneyId: createdAttorneys["Ivan Gaviria"].id, 
      role: "Supporting" 
    });
    
    // Add more law firm assignments for the other deals
    this.createDealCounsel({ 
      dealId: createdDeal2.id, 
      lawFirmId: createdFirms["Wilson Sonsini Goodrich & Rosati"].id, 
      attorneyId: createdAttorneys["David Segre"].id, 
      role: "Lead Counsel" 
    });
    
    this.createDealCounsel({ 
      dealId: createdDeal3.id, 
      lawFirmId: createdFirms["Fenwick & West LLP"].id, 
      attorneyId: createdAttorneys["Samuel Angus"].id, 
      role: "Lead Counsel" 
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
      uploadedById: createdAttorneys["Michael Platt"].id,
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
      uploadedById: createdAttorneys["Michael Platt"].id,
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



    // Create issues for Deal 1 with explicit values for all required fields
    const issue1: InsertIssue = {
      dealId: createdDeal1.id,
      title: "Valuation disagreement",
      description: "Investors pushing for 20% discount to last round valuation",
      status: "open",  // Use the schema default from shared/schema.ts
      priority: "high",
      assigneeId: createdAttorneys["Michael Platt"].id
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
      description: "Michael Platt from Cooley LLP reviewed and updated the term sheet with new valuation terms.",
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
      eventType: "general",
      referenceId: null,
      referenceType: null
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
      lawFirmId: createdFirms["Goodwin Procter LLP"].id,
      attorneyId: createdAttorneys["Anthony McCusker"].id,
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
      lawFirmId: createdFirms["Cooley LLP"].id,
      attorneyId: createdAttorneys["Michael Platt"].id,
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
    const version = this.documentVersions.get(id);
    if (version) {
      console.log(`Found document version ${id}, filename: ${version.fileName}, content length: ${version.fileContent ? version.fileContent.length : 0}`);
      console.log(`Version content starts with: ${version.fileContent ? version.fileContent.substring(0, Math.min(50, version.fileContent.length)).replace(/[\x00-\x1F\x7F-\x9F]/g, '.') : 'null or empty'}`);
    } else {
      console.log(`Document version ${id} not found`);
    }
    return version;
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
    console.log(`Comparing document versions ${versionId1} and ${versionId2}`);
    console.log(`Custom content provided: ${!!customContent1}, ${!!customContent2}`);
    
    const version1 = this.documentVersions.get(versionId1);
    const version2 = this.documentVersions.get(versionId2);
    
    if (!version1 || !version2) {
      console.error(`One or both document versions not found: ${!version1 ? versionId1 : ''} ${!version2 ? versionId2 : ''}`);
      throw new Error("One or both document versions not found");
    }
    
    console.log(`Version 1 (${versionId1}): ${version1.fileName}, Version 2 (${versionId2}): ${version2.fileName}`);
    
    // Determine which version is newer
    const olderVersion = version1.version < version2.version ? version1 : version2;
    const newerVersion = version1.version > version2.version ? version1 : version2;
    
    console.log(`Determined older version: ${olderVersion.id} (v${olderVersion.version}), newer version: ${newerVersion.id} (v${newerVersion.version})`);
    
    if (customContent1) {
      console.log(`Using custom content for version ${olderVersion.id} (length: ${customContent1.length})`);
    }
    
    if (customContent2) {
      console.log(`Using custom content for version ${newerVersion.id} (length: ${customContent2.length})`);
    }
    
    // Use our dedicated document comparison module
    return generateDocumentComparison(olderVersion, newerVersion, customContent1, customContent2);
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
  
  async getAttorney(id: number): Promise<Attorney | undefined> {
    return this.attorneys.get(id);
  }

  async createAttorney(insertAttorney: InsertAttorney): Promise<Attorney> {
    const id = this.currentAttorneyId++;
    const attorney: Attorney = { 
      ...insertAttorney, 
      id,
      phone: insertAttorney.phone || null,
      mobile: insertAttorney.mobile || null,
      photoUrl: insertAttorney.photoUrl || null,
      createdAt: new Date() 
    };
    this.attorneys.set(id, attorney);
    return attorney;
  }
  
  async updateAttorney(id: number, data: Partial<Attorney>): Promise<Attorney | undefined> {
    const attorney = this.attorneys.get(id);
    if (!attorney) {
      return undefined;
    }
    
    const updatedAttorney: Attorney = {
      ...attorney,
      ...data,
      // Ensure these fields are properly typed
      phone: data.phone !== undefined ? data.phone : attorney.phone,
      mobile: data.mobile !== undefined ? data.mobile : attorney.mobile,
      photoUrl: data.photoUrl !== undefined ? data.photoUrl : attorney.photoUrl
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
  
  async getDealsByLawFirm(lawFirmId: number): Promise<Deal[]> {
    // Find all deal counsels that reference this law firm
    const counselsWithFirm = Array.from(this.dealCounsels.values())
      .filter(counsel => counsel.lawFirmId === lawFirmId);
    
    // Extract unique deal IDs
    const dealIds = [...new Set(counselsWithFirm.map(counsel => counsel.dealId))];
    
    // Get the deals by these IDs
    const deals = Array.from(this.deals.values())
      .filter(deal => dealIds.includes(deal.id));
    
    return deals;
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

  // Task method implementations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByDeal(dealId: number): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    console.log(`DEBUG - getTasksByDeal: Map size=${this.tasks.size}, all tasks:`, JSON.stringify(allTasks));
    
    const filteredTasks = allTasks.filter(task => task.dealId === dealId);
    console.log(`DEBUG - getTasksByDeal: Filtered ${filteredTasks.length} tasks for dealId=${dealId}`);
    
    return filteredTasks;
  }

  async createTask(task: InsertTask): Promise<Task> {
    console.log("DEBUG - Creating task with data:", JSON.stringify(task, null, 2));
    console.log(`DEBUG - Current task map size before adding: ${this.tasks.size}`);
    
    // Ensure dealId is a number
    if (typeof task.dealId === 'string') {
      task.dealId = parseInt(task.dealId, 10);
      console.log("DEBUG - Converted dealId from string to number:", task.dealId);
    }
    
    const id = this.currentTaskId++;
    const now = new Date();
    
    try {
      const createdTask: Task = {
        ...task,
        id,
        createdAt: now,
        updatedAt: now,
        status: task.status || 'open',
        description: task.description || null,
        dueDate: task.dueDate || null,
        assigneeId: task.assigneeId || null,
        customAssigneeId: task.customAssigneeId || null,
        lawFirmId: task.lawFirmId || null,
        attorneyId: task.attorneyId || null
      };
      
      console.log(`DEBUG - Task created successfully with ID ${id}, adding to map`);
      this.tasks.set(id, createdTask);
      
      // Verify task was added correctly
      const verifyTask = this.tasks.get(id);
      console.log(`DEBUG - Verification - task retrieved from map:`, 
                verifyTask ? JSON.stringify(verifyTask) : "NOT FOUND!");
      
      console.log(`DEBUG - Current task map size after adding: ${this.tasks.size}`);
      return createdTask;
    } catch (error) {
      console.error("ERROR - Failed creating task:", error);
      throw error;
    }
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    console.log(`🔍 STORAGE.updateTask(${id}) - Starting update with data:`, JSON.stringify(task, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2));
    console.log(`🔍 STORAGE.updateTask(${id}) - Data types:`, {
      assigneeId: task.assigneeId !== undefined ? `${typeof task.assigneeId} - ${task.assigneeId}` : 'undefined',
      lawFirmId: task.lawFirmId !== undefined ? `${typeof task.lawFirmId} - ${task.lawFirmId}` : 'undefined',
      attorneyId: task.attorneyId !== undefined ? `${typeof task.attorneyId} - ${task.attorneyId}` : 'undefined',
      customAssigneeId: task.customAssigneeId !== undefined ? `${typeof task.customAssigneeId} - ${task.customAssigneeId}` : 'undefined',
      dueDate: task.dueDate !== undefined ? `${typeof task.dueDate} - ${task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate}` : 'undefined'
    });
    
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      console.log(`❌ STORAGE.updateTask(${id}) - Task not found`);
      return undefined;
    }
    
    console.log(`🔍 STORAGE.updateTask(${id}) - Existing task:`, JSON.stringify(existingTask, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2));

    // Check if the custom assignee is being changed
    const isCustomAssigneeChanged = task.customAssigneeId !== undefined && 
                                   task.customAssigneeId !== existingTask.customAssigneeId;
    
    console.log(`📊 STORAGE.updateTask(${id}) - BEFORE MAP SET:`, 
                `Current task in map:`, JSON.stringify([...this.tasks.entries()]
                  .filter(([taskId]) => taskId === id)
                  .map(([, t]) => ({
                    id: t.id,
                    name: t.name,
                    assigneeId: t.assigneeId,
                    customAssigneeId: t.customAssigneeId,
                    lawFirmId: t.lawFirmId,
                    attorneyId: t.attorneyId,
                    dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString() : t.dueDate
                  })), null, 2));
    
    // Create an updated task with careful handling of null values
    const updatedTask: Task = {
      ...existingTask,  // Start with existing task
      updatedAt: new Date(),  // Always update the timestamp
    };
    
    // Now explicitly set each field that could be updated, with careful null handling
    if (task.name !== undefined) {
      updatedTask.name = task.name;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating name to:`, task.name);
    }
    
    if (task.description !== undefined) {
      updatedTask.description = task.description;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating description to:`, task.description);
    }
    
    if (task.status !== undefined) {
      updatedTask.status = task.status;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating status to:`, task.status);
    }
    
    if (task.dueDate !== undefined) {
      updatedTask.dueDate = task.dueDate;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating dueDate to:`, 
        task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate);
    }
    
    if (task.assigneeId !== undefined) {
      updatedTask.assigneeId = task.assigneeId;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating assigneeId to:`, task.assigneeId);
    }
    
    if (task.customAssigneeId !== undefined) {
      updatedTask.customAssigneeId = task.customAssigneeId;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating customAssigneeId to:`, task.customAssigneeId);
    }
    
    if (task.lawFirmId !== undefined) {
      updatedTask.lawFirmId = task.lawFirmId;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating lawFirmId to:`, task.lawFirmId);
    }
    
    if (task.attorneyId !== undefined) {
      updatedTask.attorneyId = task.attorneyId;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating attorneyId to:`, task.attorneyId);
    }
    
    if (task.taskType !== undefined) {
      updatedTask.taskType = task.taskType;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating taskType to:`, task.taskType);
    }
    
    if (task.dealId !== undefined) {
      updatedTask.dealId = task.dealId;
      console.log(`🔍 STORAGE.updateTask(${id}) - Updating dealId to:`, task.dealId);
    }

    console.log(`🔍 STORAGE.updateTask(${id}) - Final updated task:`, JSON.stringify(updatedTask, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2));

    // Important - store the task
    this.tasks.set(id, updatedTask);
    
    // Double check the task was actually updated in the map
    console.log(`📊 STORAGE.updateTask(${id}) - AFTER MAP SET:`, 
                `Current task in map:`, JSON.stringify([...this.tasks.entries()]
                  .filter(([taskId]) => taskId === id)
                  .map(([, t]) => ({
                    id: t.id,
                    name: t.name,
                    assigneeId: t.assigneeId,
                    customAssigneeId: t.customAssigneeId,
                    lawFirmId: t.lawFirmId,
                    attorneyId: t.attorneyId,
                    dueDate: t.dueDate instanceof Date ? t.dueDate.toISOString() : t.dueDate
                  })), null, 2));
    
    // If the custom assignee was changed, clean up any unused custom assignees
    if (isCustomAssigneeChanged) {
      await this.deleteUnusedCustomAssignees();
    }
    
    console.log(`✅ STORAGE.updateTask(${id}) - Task updated successfully`);
    
    // Return the updated task
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    const taskDeleted = this.tasks.delete(id);
    
    if (taskDeleted) {
      // Clean up unused custom assignees after task deletion
      await this.deleteUnusedCustomAssignees();
    }
    
    return taskDeleted;
  }

  // Custom Assignee method implementations
  async getCustomAssignees(): Promise<CustomAssignee[]> {
    return Array.from(this.customAssignees.values());
  }

  async getCustomAssignee(id: number): Promise<CustomAssignee | undefined> {
    return this.customAssignees.get(id);
  }

  async createCustomAssignee(customAssignee: InsertCustomAssignee): Promise<CustomAssignee> {
    const id = this.currentCustomAssigneeId++;
    const now = new Date();
    const createdCustomAssignee: CustomAssignee = {
      ...customAssignee,
      id,
      createdAt: now
    };
    this.customAssignees.set(id, createdCustomAssignee);
    return createdCustomAssignee;
  }

  async updateCustomAssignee(id: number, customAssignee: Partial<InsertCustomAssignee>): Promise<CustomAssignee | undefined> {
    const existingCustomAssignee = this.customAssignees.get(id);
    if (!existingCustomAssignee) {
      return undefined;
    }

    const updatedCustomAssignee: CustomAssignee = {
      ...existingCustomAssignee,
      ...customAssignee
    };

    this.customAssignees.set(id, updatedCustomAssignee);
    return updatedCustomAssignee;
  }

  async deleteCustomAssignee(id: number): Promise<boolean> {
    return this.customAssignees.delete(id);
  }

  async deleteUnusedCustomAssignees(): Promise<boolean> {
    // Get all custom assignee IDs that are still attached to tasks
    const usedCustomAssigneeIds = new Set<number>();
    
    // Build a set of all custom assignee IDs currently in use
    for (const task of this.tasks.values()) {
      if (task.customAssigneeId) {
        usedCustomAssigneeIds.add(task.customAssigneeId);
      }
    }
    
    // Delete custom assignees that are not in the used set
    let deletedCount = 0;
    for (const assignee of this.customAssignees.values()) {
      if (!usedCustomAssigneeIds.has(assignee.id)) {
        const wasDeleted = this.customAssignees.delete(assignee.id);
        if (wasDeleted) {
          deletedCount++;
          console.log(`Deleted unused custom assignee: ${assignee.name} (ID: ${assignee.id})`);
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Custom assignee cleanup completed. Deleted ${deletedCount} unused assignees.`);
    }
    
    return true;
  }

  // Closing Checklist methods
  async getClosingChecklistItem(id: number): Promise<ClosingChecklistItem | undefined> {
    return this.closingChecklist.get(id);
  }

  async getClosingChecklistByDeal(dealId: number): Promise<ClosingChecklistItem[]> {
    const items: ClosingChecklistItem[] = [];
    for (const item of this.closingChecklist.values()) {
      if (item.dealId === dealId) {
        items.push(item);
      }
    }
    return items;
  }

  async createClosingChecklistItem(item: InsertClosingChecklistItem): Promise<ClosingChecklistItem> {
    const now = new Date();
    const id = this.currentClosingChecklistItemId++;
    const newItem: ClosingChecklistItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
      description: item.description || null,
      dueDate: item.dueDate || null,
      assigneeId: item.assigneeId || null,
      parentId: item.parentId || null,
      isComplete: item.isComplete !== undefined ? item.isComplete : false
    };
    this.closingChecklist.set(id, newItem);
    return newItem;
  }

  async updateClosingChecklistItem(id: number, item: Partial<InsertClosingChecklistItem>): Promise<ClosingChecklistItem | undefined> {
    const existingItem = this.closingChecklist.get(id);
    
    if (!existingItem) {
      return undefined;
    }
    
    const updatedItem: ClosingChecklistItem = {
      ...existingItem,
      ...item,
      updatedAt: new Date(),
      description: item.description !== undefined ? item.description : existingItem.description,
      dueDate: item.dueDate !== undefined ? item.dueDate : existingItem.dueDate,
      assigneeId: item.assigneeId !== undefined ? item.assigneeId : existingItem.assigneeId,
      parentId: item.parentId !== undefined ? item.parentId : existingItem.parentId,
      isComplete: item.isComplete !== undefined ? item.isComplete : existingItem.isComplete
    };
    
    this.closingChecklist.set(id, updatedItem);
    return updatedItem;
  }

  async deleteClosingChecklistItem(id: number): Promise<boolean> {
    return this.closingChecklist.delete(id);
  }

  // Initialize sample tasks and closingChecklistItems
  private initializeTasksAndChecklists() {
    console.log("DEBUG - Initializing sample tasks and checklist items");
    
    // Sample tasks for Deal 1 (Acme Corp)
    const sampleTasks = [
      {
        name: "Create stock purchase agreement",
        description: "Draft the initial SPA document for review",
        dealId: 1,
        taskType: "internal",
        status: "completed",
        dueDate: new Date("2025-02-20"),
        assigneeId: 1
      },
      {
        name: "Review term sheet with finance team",
        description: "Discuss valuation and investment terms",
        dealId: 1,
        taskType: "internal",
        status: "completed",
        dueDate: new Date("2025-02-15"),
        assigneeId: 2
      },
      {
        name: "Prepare investor presentation",
        description: "Create slides for upcoming investor meeting",
        dealId: 1,
        taskType: "internal",
        status: "in-progress",
        dueDate: new Date("2025-04-10"),
        assigneeId: 3
      },
      {
        name: "Update cap table",
        description: "Reflect new investment in the capitalization table",
        dealId: 1,
        taskType: "internal",
        status: "open",
        dueDate: new Date("2025-04-15"),
        assigneeId: 1
      },
      {
        name: "Due diligence review",
        description: "Comprehensive legal review of company documents",
        dealId: 1,
        taskType: "external",
        status: "in-progress",
        dueDate: new Date("2025-04-05"),
        lawFirmId: 1
      },
      {
        name: "Draft investor rights agreement",
        description: "Prepare investor rights and governance terms",
        dealId: 1,
        taskType: "external",
        status: "open",
        dueDate: new Date("2025-04-12"),
        lawFirmId: 1,
        attorneyId: 2
      },
      {
        name: "IP ownership verification",
        description: "Verify all intellectual property assignments and registrations",
        dealId: 1,
        taskType: "external",
        status: "open",
        dueDate: new Date("2025-04-20"),
        lawFirmId: 2
      }
    ];

    // Sample internal team tasks for Deal 2 (TechStart)
    const deal2Tasks = [
      {
        name: "Compile acquisition checklist",
        description: "Create comprehensive list of required documents",
        dealId: 2,
        taskType: "internal",
        status: "completed",
        dueDate: new Date("2025-03-10"),
        assigneeId: 3
      },
      {
        name: "Review acquisition agreement",
        description: "Detailed review of purchase terms and conditions",
        dealId: 2,
        taskType: "internal",
        status: "in-progress",
        dueDate: new Date("2025-04-05"),
        assigneeId: 1
      }
    ];

    // Sample external team tasks for Deal 3 (HealthTech)
    const deal3Tasks = [
      {
        name: "Complete Series A documents",
        description: "Finalize all Series A closing documents",
        dealId: 3,
        taskType: "external",
        status: "urgent",
        dueDate: new Date("2025-04-02"),
        lawFirmId: 1,
        attorneyId: 1
      },
      {
        name: "Coordinate signing process",
        description: "Manage document signing with all parties",
        dealId: 3,
        taskType: "internal",
        status: "open",
        dueDate: new Date("2025-04-03"),
        assigneeId: 2
      },
      {
        name: "Prepare board resolution",
        description: "Draft resolution for board approval of Series A",
        dealId: 3,
        taskType: "internal",
        status: "in-progress",
        dueDate: new Date("2025-04-01"),
        assigneeId: 1
      }
    ];

    // Combine all tasks
    const allTasks = [...sampleTasks, ...deal2Tasks, ...deal3Tasks];

    // Add all tasks
    console.log(`DEBUG - Adding ${allTasks.length} sample tasks`);
    for (const task of allTasks) {
      const taskId = this.currentTaskId++;
      const now = new Date();
      
      const createdTask: Task = {
        id: taskId,
        name: task.name,
        description: task.description || null,
        dealId: task.dealId,
        taskType: task.taskType,
        status: task.status || "open",
        dueDate: task.dueDate || null,
        assigneeId: task.assigneeId || null,
        lawFirmId: task.lawFirmId || null,
        attorneyId: task.attorneyId || null,
        customAssigneeId: null,
        createdAt: now,
        updatedAt: now
      };
      
      this.tasks.set(taskId, createdTask);
    }

    // Sample closing checklist items for Deal 1
    const sampleChecklist = [
      {
        title: "Stockholder approvals",
        dealId: 1,
        isComplete: true
      },
      {
        title: "Investor wire transfers",
        dealId: 1,
        isComplete: false
      },
      {
        title: "Board approvals",
        dealId: 1,
        isComplete: true
      },
      {
        title: "Updated cap table",
        dealId: 1,
        isComplete: false
      },
      {
        title: "Regulatory filings",
        dealId: 1,
        isComplete: false,
        parentId: null
      }
    ];

    // Add sub-items for "Regulatory filings"
    const parentItems: {[key: string]: number} = {};

    console.log("DEBUG - Adding sample closing checklist items");
    for (const item of sampleChecklist) {
      const itemId = this.currentClosingChecklistItemId++;
      const now = new Date();
      
      const createdItem: ClosingChecklistItem = {
        id: itemId,
        title: item.title,
        dealId: item.dealId,
        isComplete: item.isComplete || false,
        description: null,
        dueDate: null,
        assigneeId: null,
        parentId: item.parentId || null,
        createdAt: now,
        updatedAt: now
      };
      
      this.closingChecklist.set(itemId, createdItem);
      
      // Store the IDs of items that might have children
      if (item.title === "Regulatory filings") {
        parentItems["Regulatory filings"] = itemId;
      }
    }

    // Add sub-items for "Regulatory filings"
    const regulatorySubItems = [
      {
        title: "Securities filings",
        dealId: 1,
        isComplete: false,
        parentId: parentItems["Regulatory filings"]
      },
      {
        title: "Blue sky filings",
        dealId: 1,
        isComplete: false,
        parentId: parentItems["Regulatory filings"]
      },
      {
        title: "CFIUS review",
        dealId: 1,
        isComplete: false,
        parentId: parentItems["Regulatory filings"]
      }
    ];

    for (const item of regulatorySubItems) {
      const itemId = this.currentClosingChecklistItemId++;
      const now = new Date();
      
      const createdItem: ClosingChecklistItem = {
        id: itemId,
        title: item.title,
        dealId: item.dealId,
        isComplete: item.isComplete || false,
        description: null,
        dueDate: null,
        assigneeId: null,
        parentId: item.parentId,
        createdAt: now,
        updatedAt: now
      };
      
      this.closingChecklist.set(itemId, createdItem);
    }

    // Sample closing checklist items for Deal 2 (TechStart Acquisition)
    const deal2Checklist = [
      {
        title: "Due diligence completed",
        dealId: 2,
        isComplete: true
      },
      {
        title: "Transaction documents signed",
        dealId: 2,
        isComplete: true
      },
      {
        title: "Regulatory approvals",
        dealId: 2,
        isComplete: false
      },
      {
        title: "IP assignments registered",
        dealId: 2,
        isComplete: false
      },
      {
        title: "Employee transitions",
        dealId: 2,
        isComplete: false
      }
    ];

    for (const item of deal2Checklist) {
      const itemId = this.currentClosingChecklistItemId++;
      const now = new Date();
      
      const createdItem: ClosingChecklistItem = {
        id: itemId,
        title: item.title,
        dealId: item.dealId,
        isComplete: item.isComplete || false,
        description: null,
        dueDate: null,
        assigneeId: null,
        parentId: null,
        createdAt: now,
        updatedAt: now
      };
      
      this.closingChecklist.set(itemId, createdItem);
    }

    // Sample closing checklist items for Deal 3 (HealthTech Series A)
    const deal3Checklist = [
      {
        title: "Term sheet finalized",
        dealId: 3,
        isComplete: true
      },
      {
        title: "Stock purchase agreement",
        dealId: 3,
        isComplete: false
      },
      {
        title: "Investor rights agreement",
        dealId: 3,
        isComplete: false
      },
      {
        title: "Voting agreement",
        dealId: 3,
        isComplete: false
      },
      {
        title: "ROFR & Co-Sale agreement",
        dealId: 3,
        isComplete: false
      },
      {
        title: "Company legal opinion",
        dealId: 3,
        isComplete: false
      },
      {
        title: "Management rights letter",
        dealId: 3,
        isComplete: false
      }
    ];

    for (const item of deal3Checklist) {
      const itemId = this.currentClosingChecklistItemId++;
      const now = new Date();
      
      const createdItem: ClosingChecklistItem = {
        id: itemId,
        title: item.title,
        dealId: item.dealId,
        isComplete: item.isComplete || false,
        description: null,
        dueDate: null,
        assigneeId: null,
        parentId: null,
        createdAt: now,
        updatedAt: now
      };
      
      this.closingChecklist.set(itemId, createdItem);
    }

    console.log(`DEBUG - Added ${this.tasks.size} tasks and ${this.closingChecklist.size} checklist items`);
  }
}

export const storage = new MemStorage();