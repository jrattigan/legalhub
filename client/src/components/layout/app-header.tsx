import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, Bell, Menu, X, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

interface AppHeaderProps {
  title?: string;
  user?: User;
  notifications?: number;
}

export default function AppHeader({ title, user, notifications = 0 }: AppHeaderProps) {
  const [location] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Consistent nav items for all pages
  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Companies', path: '/companies' },
    { name: 'Deals', path: '/deals' },
    { name: 'Documents', path: '/documents' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Outside Counsel', path: '/counsel' },
    { name: 'Reports', path: '/reports' },
  ];

  return (
    <header className="bg-white border-b border-neutral-200 h-16 flex items-center px-4 justify-between z-10 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          {/* Always show the logo on all pages */}
          <Link 
            href="/dashboard" 
            className="font-bold text-gradient text-xl cursor-pointer"
          >
            LegalDeal
          </Link>
          {title && title !== "LegalDeal" && (
            <span className="text-neutral-500 ml-2 px-2 py-0.5 text-sm font-medium">
              {title}
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                location === item.path 
                  ? 'text-primary bg-primary/10' 
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {isSearchOpen ? (
          <div className="absolute inset-0 h-16 bg-white flex items-center p-3 z-20 shadow-md">
            <Input 
              className="flex-1 h-10 bg-gray-50 border-neutral-300" 
              placeholder="Search deals, documents, tasks..." 
              autoFocus 
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-2 text-neutral-600 hover:text-neutral-900" 
              onClick={() => setIsSearchOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-neutral-600 hover:text-primary transition-colors"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}

        <div className="relative">
          <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary transition-colors relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-white" />
            )}
          </Button>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div 
                className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: user.avatarColor }}
              >
                <span>{user.initials}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user.fullName}</span>
                  <span className="text-xs text-neutral-500">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-sm hover:shadow-md transition-shadow">
            <span>GC</span>
          </div>
        )}

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary transition-colors">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] border-l-neutral-200">
              <div className="py-4 space-y-6">
                <div className="flex items-center px-2">
                  <Link 
                    href="/dashboard" 
                    className="font-bold text-gradient text-xl"
                  >
                    LegalDeal
                  </Link>
                  {title && title !== "LegalDeal" && (
                    <span className="text-neutral-500 ml-2 px-2 py-0.5 text-sm font-medium">
                      {title}
                    </span>
                  )}
                </div>
                <nav className="flex flex-col space-y-1">
                  {navItems.map((item) => (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`px-4 py-2.5 rounded-md cursor-pointer transition-colors ${
                        location === item.path 
                          ? 'text-primary bg-primary/10 font-medium' 
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
