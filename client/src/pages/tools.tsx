import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layouts/app-layout';
import { FileText, Diff, SlidersHorizontal, Calculator, Calendar, FileSearch } from 'lucide-react';

export default function ToolsPage() {
  const tools = [
    {
      id: 'redline',
      name: 'Redline',
      description: 'Compare documents and highlight differences',
      icon: <Diff className="h-6 w-6 text-primary" />,
      link: '/tools/redline',
      beta: false,
    },
    {
      id: 'calculator',
      name: 'Deal Calculator',
      description: 'Calculate deal terms, ROFR, pro-rata, and more',
      icon: <Calculator className="h-6 w-6 text-primary" />,
      link: '/tools/calculator',
      beta: true,
    },
    {
      id: 'calendar',
      name: 'Deal Calendar',
      description: 'Track important dates and deadlines',
      icon: <Calendar className="h-6 w-6 text-primary" />,
      link: '/tools/calendar',
      beta: true,
    },
    {
      id: 'search',
      name: 'Advanced Search',
      description: 'Search across all deals and documents',
      icon: <FileSearch className="h-6 w-6 text-primary" />,
      link: '/tools/search',
      beta: true,
    },
    {
      id: 'doc-analyzer',
      name: 'Document Analyzer',
      description: 'Analyze term sheets and contracts',
      icon: <FileText className="h-6 w-6 text-primary" />,
      link: '/tools/doc-analyzer',
      beta: true,
    },
    {
      id: 'preferences',
      name: 'Preferences',
      description: 'Configure tool preferences and defaults',
      icon: <SlidersHorizontal className="h-6 w-6 text-primary" />,
      link: '/tools/preferences',
      beta: true,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground mt-2">
            Standalone utilities to enhance your dealmaking workflow
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Card key={tool.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-md bg-primary/10 flex items-center justify-center">
                      {tool.icon}
                    </div>
                    <div>
                      <CardTitle>{tool.name}</CardTitle>
                    </div>
                  </div>
                  {tool.beta && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      BETA
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{tool.description}</CardDescription>
              </CardContent>
              <CardFooter className="border-t pt-4 bg-muted/10">
                <Button asChild className={tool.beta ? 'w-full opacity-50 pointer-events-none' : 'w-full'}>
                  <Link href={tool.link}>
                    {tool.beta ? 'Coming Soon' : 'Open Tool'}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}