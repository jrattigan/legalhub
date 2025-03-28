import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  File, 
  Users,
  Building2
} from 'lucide-react';

import { useMediaQuery } from '@/hooks/use-mobile';
import { Deal } from '@shared/schema';

interface SidebarProps {
  recentDeals?: Deal[];
}

export default function Sidebar({ recentDeals = [] }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: 'Companies',
      path: '/companies',
      icon: <Building2 className="h-5 w-5" />
    },
    { 
      name: 'My Deals', 
      path: '/deals', 
      icon: <FileText className="h-5 w-5" />
    },
    { 
      name: 'My Tasks', 
      path: '/tasks', 
      icon: <CheckSquare className="h-5 w-5" />
    },
    { 
      name: 'Documents', 
      path: '/documents', 
      icon: <File className="h-5 w-5" />
    },
    { 
      name: 'Outside Counsel', 
      path: '/counsel', 
      icon: <Users className="h-5 w-5" />
    },
  ];

  // Check if we're on a companies-related page
  const isCompaniesPage = location.startsWith('/companies');

  return (
    <div className="bg-white w-14 md:w-56 border-r border-neutral-200 flex-shrink-0 transition-all duration-300 h-full flex flex-col">
      {isCompaniesPage && (
        <div className="py-4 px-3 border-b border-neutral-200">
          <Link href="/dashboard" className="font-bold text-gradient text-xl hidden md:block">
            LegalDeal
          </Link>
        </div>
      )}
      <div className="p-2 flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {navItems.map(item => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`w-full flex items-center justify-center md:justify-start px-3 py-2 rounded-md ${
                location === item.path 
                  ? 'bg-primary-light text-primary font-medium' 
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {item.icon}
              <span className="hidden md:inline ml-2">{item.name}</span>
            </Link>
          ))}
        </div>
        
        {recentDeals.length > 0 && (
          <div className="mt-6 pt-6 border-t border-neutral-200 space-y-1">
            <div className="px-3 py-1 text-xs text-neutral-400 hidden md:block">RECENT DEALS</div>
            
            {recentDeals.slice(0, 5).map(deal => (
              <Link 
                key={deal.id} 
                href={`/deals/${deal.id}`}
                className="w-full flex items-center justify-center md:justify-start px-3 py-2 rounded-md text-neutral-600 hover:bg-neutral-100"
              >
                <File className="h-5 w-5 text-neutral-400 md:mr-2" />
                <span className="hidden md:inline truncate text-sm">{deal.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
