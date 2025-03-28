import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AppHeader from './app-header';
import { User } from '@shared/schema';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ['/api/users/1'],
    retry: 1,
  });

  return (
    <div className="min-h-screen h-screen flex flex-col">
      <AppHeader user={user} notifications={2} />
      
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}