import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";
import { getInitials } from "@/lib/utils";

// Define the Task interface
interface Task {
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

// Define the types here as well to avoid module resolution issues
interface User {
  id: number;
  username: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface LawFirm {
  id: number;
  name: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface Attorney {
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

interface CustomAssignee {
  id: number;
  name: string;
  createdAt: string;
}

export interface AssigneeAvatarProps {
  task: Task;
  size?: "sm" | "md" | "lg";
  users: User[];
  attorneys: Attorney[];
  lawFirms: LawFirm[];
  customAssignees: CustomAssignee[];
}

function getAvatarColor(task: Task, users: User[], attorneys: Attorney[]): string {
  if (task.assigneeId) {
    const user = users.find(u => u.id === task.assigneeId);
    return user?.avatarColor || "bg-primary";
  } else if (task.attorneyId) {
    const attorney = attorneys.find(a => a.id === task.attorneyId);
    return attorney?.avatarColor || "bg-emerald-500";
  }
  
  return "bg-slate-500";
}

function getAssigneeInitials(task: Task, users: User[], attorneys: Attorney[], lawFirms: LawFirm[], customAssignees: CustomAssignee[]): string {
  if (task.assigneeId) {
    const user = users.find(u => u.id === task.assigneeId);
    return user?.initials || getInitials(user?.fullName || "Unknown User");
  } else if (task.customAssigneeId) {
    const customAssignee = customAssignees.find(ca => ca.id === task.customAssigneeId);
    return getInitials(customAssignee?.name || "Unknown Assignee");
  } else if (task.lawFirmId && !task.attorneyId) {
    const lawFirm = lawFirms.find(lf => lf.id === task.lawFirmId);
    return getInitials(lawFirm?.name || "Unknown Law Firm");
  } else if (task.attorneyId) {
    const attorney = attorneys.find(a => a.id === task.attorneyId);
    return attorney?.initials || getInitials(attorney?.name || "Unknown Attorney");
  }
  
  return "UA"; // Unassigned
}

function getAssigneePhotoUrl(task: Task, attorneys: Attorney[]): string | null {
  if (task.attorneyId) {
    const attorney = attorneys.find(a => a.id === task.attorneyId);
    return attorney?.photoUrl || null;
  }
  
  return null;
}

export function AssigneeAvatar({ 
  task, 
  size = "md", 
  users, 
  attorneys, 
  lawFirms, 
  customAssignees 
}: AssigneeAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base"
  };
  
  const avatarColor = getAvatarColor(task, users, attorneys);
  const initials = getAssigneeInitials(task, users, attorneys, lawFirms, customAssignees);
  const photoUrl = getAssigneePhotoUrl(task, attorneys);
  
  return (
    <Avatar className={sizeClasses[size]}>
      {photoUrl && <AvatarImage src={photoUrl} alt={initials} />}
      <AvatarFallback className={avatarColor}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}