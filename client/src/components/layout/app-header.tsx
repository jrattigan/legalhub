import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, Bell, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { User } from '@shared/schema';

interface AppHeaderProps {
  user?: User;
  notifications?: number;
}

export default function AppHeader({ user, notifications = 0 }: AppHeaderProps) {
  const [location] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { name: 'Deals', path: '/deals' },
    { name: 'Documents', path: '/documents' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Outside Counsel', path: '/counsel' },
    { name: 'Reports', path: '/reports' },
  ];

  return (
    <header className="bg-white border-b border-neutral-200 h-14 flex items-center px-4 justify-between z-10">
      <div className="flex items-center space-x-4">
        <div className="font-bold text-primary text-xl cursor-pointer" onClick={() => window.location.href = '/dashboard'}>
          LegalDeal
        </div>

        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`px-3 py-1.5 rounded text-sm cursor-pointer ${
                location === item.path 
                  ? 'text-primary bg-primary-light' 
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
              onClick={() => window.location.href = item.path}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {isSearchOpen ? (
          <div className="absolute inset-0 h-14 bg-white flex items-center p-3 z-20">
            <Input 
              className="flex-1 h-9" 
              placeholder="Search deals, documents, tasks..." 
              autoFocus 
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-2" 
              onClick={() => setIsSearchOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-neutral-500"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}

        <div className="relative">
          <Button variant="ghost" size="icon" className="text-neutral-500 relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
        </div>

        {user ? (
          <div 
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm cursor-pointer"
            style={{ backgroundColor: user.avatarColor }}
          >
            <span>{user.initials}</span>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm cursor-pointer">
            <span>GC</span>
          </div>
        )}

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-500">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px]">
              <div className="py-4 space-y-4">
                <div className="font-bold text-primary text-xl">LegalDeal</div>
                <nav className="flex flex-col space-y-1">
                  {navItems.map((item) => (
                    <div
                      key={item.path}
                      className={`px-3 py-2 rounded cursor-pointer ${
                        location === item.path 
                          ? 'text-primary bg-primary-light' 
                          : 'text-neutral-500 hover:bg-neutral-100'
                      }`}
                      onClick={() => window.location.href = item.path}
                    >
                      {item.name}
                    </div>
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
