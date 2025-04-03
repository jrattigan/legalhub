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
    { name: 'Outside Counsel', path: '/counsel' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Reports', path: '/reports' },
  ];

  return (
    <header className="bg-white border-b border-neutral-100 h-16 flex items-center px-5 justify-between z-10 shadow-sm">
      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          {/* Always show the logo on all pages */}
          <Link 
            href="/dashboard" 
            className="font-bold text-gradient text-xl cursor-pointer tracking-tight"
          >
            LegalDeal
          </Link>
          {title && title !== "LegalDeal" && (
            <div className="ml-2.5 px-2 py-0.5 text-sm font-medium bg-gray-50 text-gray-600 rounded-md border border-gray-100">
              {title}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center space-x-1.5">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                location === item.path 
                  ? 'text-primary bg-primary/10 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-primary hover:-translate-y-0.5'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {isSearchOpen ? (
          <div className="absolute inset-0 h-16 bg-white flex items-center p-4 z-20 shadow-md">
            <Input 
              className="flex-1 h-10 bg-gray-50 border-neutral-200 rounded-lg" 
              placeholder="Search deals, documents, issues..." 
              autoFocus 
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full" 
              onClick={() => setIsSearchOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-500 hover:text-primary hover:bg-gray-50 transition-all rounded-lg"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4 mr-1.5" />
            <span className="text-sm hidden sm:inline-block">Search</span>
          </Button>
        )}

        <div className="relative">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-gray-50 transition-all rounded-lg relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-white animate-pulse" />
            )}
          </Button>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div 
                className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-white"
                style={{ backgroundColor: user.avatarColor }}
              >
                <span>{user.initials}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1 rounded-lg shadow-lg border border-gray-100">
              <DropdownMenuLabel className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{user.fullName}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                  <span className="text-xs mt-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 w-fit">{user.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer rounded-md my-0.5 focus:bg-primary/5">
                  <Settings className="mr-2.5 h-4 w-4 text-gray-500" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="rounded-md my-0.5 focus:bg-primary/5">
                <UserIcon className="mr-2.5 h-4 w-4 text-gray-500" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem className="rounded-md my-0.5 focus:bg-destructive/5 focus:text-destructive">
                <LogOut className="mr-2.5 h-4 w-4 text-gray-500" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-medium cursor-pointer shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 border-2 border-white">
            <span>GC</span>
          </div>
        )}

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-gray-50 transition-all rounded-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] border-l-neutral-100 p-0">
              <div className="py-5 space-y-6">
                <div className="flex items-center justify-between px-5 border-b border-neutral-100 pb-4">
                  <Link 
                    href="/dashboard" 
                    className="font-bold text-gradient text-xl tracking-tight"
                  >
                    LegalDeal
                  </Link>
                  
                  {title && title !== "LegalDeal" && (
                    <div className="ml-2 px-2 py-0.5 text-sm font-medium bg-gray-50 text-gray-600 rounded-md border border-gray-100">
                      {title}
                    </div>
                  )}
                </div>
                
                {user && (
                  <div className="px-5 py-2 bg-gray-50 mx-4 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm border-2 border-white"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        <span>{user.initials}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.fullName}</span>
                        <span className="text-xs text-gray-500">{user.role}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <nav className="flex flex-col space-y-1 px-3">
                  {navItems.map((item) => (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
                        location === item.path 
                          ? 'text-primary bg-primary/10 font-medium shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-primary hover:-translate-y-0.5'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
                
                <div className="px-4 pt-4 mt-2 border-t border-gray-100">
                  <Button variant="outline" className="w-full justify-start text-gray-600" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-gray-600 mt-2" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
