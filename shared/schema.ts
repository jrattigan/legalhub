import { pgTable, text, serial, integer, boolean, timestamp, jsonb, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  initials: text("initials").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  avatarColor: text("avatar_color").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  initials: true,
  email: true,
  role: true,
  avatarColor: true,
});

// Companies schema
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  url: text("url"),
  bcvTeam: json("bcv_team").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  legalName: true,
  displayName: true,
  url: true,
  bcvTeam: true,
}).transform((data) => {
  // Ensure URL and bcvTeam are null and not undefined when empty
  const transformedData = { ...data };
  
  if (transformedData.url === undefined) {
    transformedData.url = null;
  }
  
  if (transformedData.bcvTeam === undefined) {
    transformedData.bcvTeam = null;
  }
  
  return transformedData;
});


// Deals schema
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dealId: text("deal_id").notNull().unique(),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),  // Renamed to "Closing Date" in UI
  isCommitted: boolean("is_committed").default(false),
  companyId: integer("company_id").notNull(),  // Foreign key to companies table
  companyName: text("company_name").notNull(), // For backward compatibility
  amount: text("amount"),
  leadInvestor: text("lead_investor"),
  leadInvestorCounsel: text("lead_investor_counsel"),
  leadInvestorAttorneys: text("lead_investor_attorneys"),
  companyCounsel: text("company_counsel"),
  currentStatus: text("current_status"),
  termSheetUrl: text("term_sheet_url"),
  dataRoomUrl: text("data_room_url"),
  shareClass: text("share_class"),
  numberOfShares: integer("number_of_shares"),
  allocationFunds: json("allocation_funds").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDealSchema = createInsertSchema(deals).pick({
  title: true,
  description: true,
  dealId: true,
  status: true,
  dueDate: true,
  isCommitted: true,
  companyId: true,
  companyName: true,
  amount: true,
  leadInvestor: true,
  leadInvestorCounsel: true,
  leadInvestorAttorneys: true,
  companyCounsel: true,
  currentStatus: true,
  termSheetUrl: true,
  dataRoomUrl: true,
  shareClass: true,
  numberOfShares: true,
  allocationFunds: true,
}).transform((data) => {
  const transformedData = { ...data };
  
  // Handle date conversion from string to Date
  if (transformedData.dueDate && typeof transformedData.dueDate === 'string') {
    transformedData.dueDate = new Date(transformedData.dueDate);
  }
  
  return transformedData;
});

// Deal users (team members)
export const dealUsers = pgTable("deal_users", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(),
});

export const insertDealUserSchema = createInsertSchema(dealUsers).pick({
  dealId: true,
  userId: true,
  role: true,
});

// Documents schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  status: text("status").notNull().default("draft"),
  assigneeId: integer("assignee_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // While this isn't a physical column in the database, we include it to type the object
  // when it's joined with version count data from the document_versions table
  versions: integer("versions"),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  dealId: true,
  title: true,
  description: true,
  category: true,
  status: true,
  assigneeId: true,
}).transform((data) => {
  // Ensure assigneeId and description are null and not undefined when empty
  const transformedData = { ...data };
  
  if (transformedData.assigneeId === undefined) {
    transformedData.assigneeId = null;
  }
  
  if (transformedData.description === undefined) {
    transformedData.description = null;
  }
  
  return transformedData;
});

// Document versions
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  version: integer("version").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  fileContent: text("file_content").notNull(), // Base64 encoded content for this demo
  uploadedById: integer("uploaded_by_id").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).pick({
  documentId: true,
  version: true,
  fileName: true,
  fileSize: true,
  fileType: true,
  fileContent: true,
  uploadedById: true,
  comment: true,
}).transform((data) => {
  // Ensure comment is null not undefined when empty
  const transformedData = { ...data };
  
  if (transformedData.comment === undefined) {
    transformedData.comment = null;
  }
  
  return transformedData;
});



// Issues schema
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  assigneeId: integer("assignee_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIssueSchema = createInsertSchema(issues).pick({
  dealId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assigneeId: true,
}).transform((data) => {
  // Ensure assigneeId is null and not undefined when empty
  const transformedData = { ...data };
  
  if (transformedData.assigneeId === undefined) {
    transformedData.assigneeId = null;
  }
  
  return transformedData;
});

// Outside counsel (law firms)
export const lawFirms = pgTable("law_firms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLawFirmSchema = createInsertSchema(lawFirms).pick({
  name: true,
  specialty: true,
  email: true,
  phone: true,
});

// Attorneys (associated with law firms)
export const attorneys = pgTable("attorneys", {
  id: serial("id").primaryKey(),
  lawFirmId: integer("law_firm_id").notNull(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  email: text("email").notNull(),
  phone: text("phone"), // Renamed to "Work" in UI
  mobile: text("mobile"), // New field for mobile number
  initials: text("initials").notNull(),
  avatarColor: text("avatar_color").notNull(),
  photoUrl: text("photo_url"), // New field for attorney photo
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttorneySchema = createInsertSchema(attorneys).pick({
  lawFirmId: true,
  name: true,
  position: true,
  email: true,
  phone: true,
  mobile: true,
  initials: true,
  avatarColor: true,
  photoUrl: true,
});

// Deal counsel assignments
export const dealCounsels = pgTable("deal_counsels", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  lawFirmId: integer("law_firm_id").notNull(),
  role: text("role").notNull(), // lead, supporting, etc.
  attorneyId: integer("attorney_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDealCounselSchema = createInsertSchema(dealCounsels).pick({
  dealId: true,
  lawFirmId: true,
  role: true,
  attorneyId: true,
  notes: true,
});

// Timeline events
export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type").notNull(), // document, issue, general, milestone, etc.
  referenceId: integer("reference_id"), // ID of the related item (document, issue, etc.)
  referenceType: text("reference_type"), // Type of the reference (document, issue, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).pick({
  dealId: true,
  title: true,
  description: true,
  eventType: true,
  referenceId: true,
  referenceType: true,
});

// Closing checklist items
export const closingChecklist = pgTable("closing_checklist", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  assigneeId: integer("assignee_id"),
  isComplete: boolean("is_complete").default(false),
  parentId: integer("parent_id"), // Parent item ID for sub-items
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClosingChecklistSchema = createInsertSchema(closingChecklist).pick({
  dealId: true,
  title: true,
  description: true,
  dueDate: true,
  assigneeId: true,
  isComplete: true,
  parentId: true,
}).transform((data) => {
  const transformedData = { ...data };
  
  if (transformedData.assigneeId === undefined) {
    transformedData.assigneeId = null;
  }
  
  if (transformedData.dueDate && typeof transformedData.dueDate === 'string') {
    transformedData.dueDate = new Date(transformedData.dueDate);
  }
  
  if (transformedData.parentId === undefined) {
    transformedData.parentId = null;
  }
  
  return transformedData;
});

// Application global settings
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).pick({
  key: true,
  value: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export type DealUser = typeof dealUsers.$inferSelect;
export type InsertDealUser = z.infer<typeof insertDealUserSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

// Tasks schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  assigneeId: integer("assignee_id"), // For internal tasks, this will be a user ID
  customAssigneeId: integer("custom_assignee_id"), // For external tasks with a custom assignee
  lawFirmId: integer("law_firm_id"), // For external tasks, this will be a law firm ID
  attorneyId: integer("attorney_id"), // For external tasks, this will be an attorney ID
  taskType: text("task_type").notNull(), // 'internal' or 'external'
  status: text("status").notNull().default("open"), // 'open' or 'completed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  dealId: true,
  name: true,
  description: true,
  dueDate: true,
  assigneeId: true,
  customAssigneeId: true,
  lawFirmId: true,
  attorneyId: true,
  taskType: true,
  status: true,
}).transform((data) => {
  // Ensure optional fields are null not undefined when empty
  const transformedData = { ...data };
  
  if (transformedData.description === undefined) {
    transformedData.description = null;
  }
  
  if (transformedData.dueDate && typeof transformedData.dueDate === 'string') {
    transformedData.dueDate = new Date(transformedData.dueDate);
  } else if (transformedData.dueDate === undefined) {
    transformedData.dueDate = null;
  }
  
  if (transformedData.assigneeId === undefined) {
    transformedData.assigneeId = null;
  }
  
  if (transformedData.customAssigneeId === undefined) {
    transformedData.customAssigneeId = null;
  }
  
  if (transformedData.lawFirmId === undefined) {
    transformedData.lawFirmId = null;
  }
  
  if (transformedData.attorneyId === undefined) {
    transformedData.attorneyId = null;
  }
  
  return transformedData;
});

// Custom Assignees schema (for external tasks)
export const customAssignees = pgTable("custom_assignees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomAssigneeSchema = createInsertSchema(customAssignees).pick({
  name: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type CustomAssignee = typeof customAssignees.$inferSelect;
export type InsertCustomAssignee = z.infer<typeof insertCustomAssigneeSchema>;

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;

export type LawFirm = typeof lawFirms.$inferSelect;
export type InsertLawFirm = z.infer<typeof insertLawFirmSchema>;

export type Attorney = typeof attorneys.$inferSelect;
export type InsertAttorney = z.infer<typeof insertAttorneySchema>;

export type DealCounsel = typeof dealCounsels.$inferSelect;
export type InsertDealCounsel = z.infer<typeof insertDealCounselSchema>;

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;

export type ClosingChecklistItem = typeof closingChecklist.$inferSelect;
export type InsertClosingChecklistItem = z.infer<typeof insertClosingChecklistSchema>;

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingsSchema>;

export type Fund = typeof funds.$inferSelect;
export type InsertFund = z.infer<typeof insertFundSchema>;

export type Allocation = typeof allocations.$inferSelect;
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;

// Organization Funds table for tracking investment vehicles
export const funds = pgTable("funds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFundSchema = createInsertSchema(funds).pick({
  name: true,
  description: true,
  isActive: true,
}).transform((data) => {
  // Ensure description is null and not undefined when empty
  const transformedData = { ...data };
  
  if (transformedData.description === undefined) {
    transformedData.description = null;
  }
  
  return transformedData;
});

// Deal Allocations table for fund-specific investment details
export const allocations = pgTable("allocations", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  fundId: integer("fund_id").notNull().references(() => funds.id, { onDelete: "cascade" }),
  investmentAmount: text("investment_amount").notNull(), // Storing as text to handle currency formatting
  shareClass: text("share_class"),
  numberOfShares: integer("number_of_shares"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAllocationSchema = createInsertSchema(allocations).pick({
  dealId: true,
  fundId: true,
  investmentAmount: true,
  shareClass: true,
  numberOfShares: true,
}).transform((data) => {
  // Ensure optional fields are null not undefined when empty
  const transformedData = { ...data };
  
  if (transformedData.shareClass === undefined) {
    transformedData.shareClass = null;
  }
  
  if (transformedData.numberOfShares === undefined) {
    transformedData.numberOfShares = null;
  }
  
  return transformedData;
});