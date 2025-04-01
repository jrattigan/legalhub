// Define interfaces for the application

export interface Task {
  id: number;
  name: string;
  description: string | null;
  dealId: number;
  dueDate: string | null;
  assigneeId: number | null;
  customAssigneeId: number | null;
  lawFirmId: number | null;
  attorneyId: number | null;
  taskType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor: string;
}

export interface LawFirm {
  id: number;
  name: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface Attorney {
  id: number;
  lawFirmId: number;
  name: string;
  position: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  initials: string;
  avatarColor: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface CustomAssignee {
  id: number;
  name: string;
  createdAt: string;
}

export interface Deal {
  id: number;
  name: string;
  type: string;
  status: string;
  companyId: number;
  amount: number;
  valuation: number | null;
  leadInvestor: string | null;
  closingDate: string | null;
  createdAt: string;
  updatedAt: string;
  description: string | null;
}

export interface Company {
  id: number;
  legalName: string;
  displayName: string;
  website: string | null;
  industry: string;
  foundedYear: number;
  logo: string | null;
  createdAt: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dealId: number;
  assigneeId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: number;
  filename: string;
  dealId: number;
  documentType: string;
  versions: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: number;
  dealId: number;
  eventType: string;
  description: string;
  timestamp: string;
  userId: number | null;
}