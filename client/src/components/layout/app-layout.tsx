import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AppHeader from './app-header';
import Sidebar from './sidebar';
import { Deal } from '@shared/schema';

// Define the User interface
interface User {
  id: number;
  username: string;
  password: string;
  fullName: string;
  initials: string;
  email: string;
  role: string;
  avatarColor: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ['/api/users/1'],
    retry: 1,
  });

  // Fetch recent deals for sidebar
  const { data: deals } = useQuery<Deal[]>({
    queryKey: ['/api/deals'],
    retry: 1,
  });
  
  const recentDeals = deals?.slice(0, 5) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} notifications={2} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar recentDeals={recentDeals} />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}