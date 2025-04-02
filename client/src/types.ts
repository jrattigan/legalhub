// Define all common types used across the application

export interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor: string;
}

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

export interface Company {
  id: number;
  legalName: string;
  displayName: string;
  url: string | null;
  bcvTeam: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: number;
  title: string;
  description: string | null;
  dealId?: string;
  companyId: number;
  companyName: string;
  amount: string | null;
  status: string;
  dueDate: string | null;
  isCommitted?: boolean;
  leadInvestor: string;
  leadInvestorCounsel?: string | null;
  dataRoomUrl?: string | null;
  termSheetUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: number;
  role: string;
  user: User;
}

export interface DealCounsel {
  role: string;
  lawFirm: LawFirm;
  attorney: Attorney | null;
}

export interface LawFirmOption {
  id: number;
  name: string;
  attorneys: { id: number; name: string; role: string }[];
}

export interface Allocation {
  dealId: number;
  fundId: number;
  investmentAmount: string;
  equityPercentage: string | null;
  createdAt: string;
  updatedAt: string;
  fund: {
    id: number;
    name: string;
    description: string;
  };
}

export interface ClosingChecklistItem {
  id: number;
  title: string;
  description: string | null;
  dealId: number;
  isComplete: boolean;
  dueDate: string | null;
  assigneeId: number | null;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}