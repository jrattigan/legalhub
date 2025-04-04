import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  Users,
  BarChart2,
  Settings,
  Menu,
  X,
  User,
  LogOut,
  Building2,
  Wrench,
  Book,
  ChevronRight,
  BriefcaseBusiness,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [expanded, setExpanded] = React.useState(false);
  const { toast } = useToast();

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const mainNavItems = [
    {
      title: 'Dashboard',
      href: '/',
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: 'Deals',
      href: '/deals',
      icon: <BriefcaseBusiness className="h-5 w-5" />,
    },
    {
      title: 'Companies',
      href: '/companies',
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: <BarChart2 className="h-5 w-5" />,
    },
    {
      title: 'Documents',
      href: '/documents',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: 'Tools',
      href: '/tools',
      icon: <Wrench className="h-5 w-5" />,
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-card transition-all duration-300 sm:relative",
          expanded ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-14 items-center border-b px-3">
          <Link href="/">
            <div className="flex items-center gap-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Book className="h-5 w-5" />
              </div>
              <span className={cn("font-semibold", !expanded && "hidden")}>Deal Manager</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto", !expanded && "hidden sm:flex")}
            onClick={toggleSidebar}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto", expanded && "hidden")}
            onClick={toggleSidebar}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Expand sidebar</span>
          </Button>
        </div>
        <nav className="flex-1 overflow-auto py-3">
          <div className="px-3">
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      location === item.href
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.icon}
                    <span className={cn("", !expanded && "hidden")}>{item.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <div className={cn("mt-auto border-t p-3", !expanded && "items-center")}>
          <div className="flex items-center gap-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
              <User className="h-4 w-4" />
            </div>
            <div className={cn("flex flex-col", !expanded && "hidden")}>
              <span className="text-sm font-medium">Alex Johnson</span>
              <span className="text-xs text-muted-foreground">General Counsel</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn("ml-auto", !expanded && "hidden")}
              onClick={() => {
                toast({
                  title: "Logged out",
                  description: "You have been logged out of your account.",
                });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed left-4 top-3 z-40 sm:hidden",
          expanded && "hidden"
        )}
        onClick={toggleSidebar}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {/* Content area */}
      <div className={cn(
        "flex flex-1 flex-col overflow-hidden",
        expanded ? "ml-64" : "ml-16",
        "sm:ml-0 w-full"
      )}>
        <header className="h-14 border-b bg-card px-6 flex items-center justify-between">
          <div>
            {/* Dynamic header content could go here */}
          </div>
          <div className="flex items-center gap-4">
            {/* Header actions could go here */}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}