import React from 'react';
import { Link } from 'wouter';
import AppLayout from '../components/layouts/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowRight, Info, Calculator, FileSearch, File, FileDiff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ToolsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground">Standalone utilities to complement your deal workflows</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Redline Tool Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded text-primary">
                  <FileDiff size={24} />
                </div>
                <CardTitle>Redline</CardTitle>
              </div>
              <CardDescription>
                Compare documents and visualize changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload two versions of a document and see additions, deletions, and changes highlighted in a clear, easy-to-read format.
              </p>
            </CardContent>
            <CardFooter className="border-t pt-4 pb-2">
              <Link href="/tools/redline">
                <Button variant="outline" className="w-full">
                  Open Tool
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
          
          {/* Deal Calculator Card - Coming Soon */}
          <Card className="opacity-75">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded text-primary">
                  <Calculator size={24} />
                </div>
                <CardTitle>Deal Calculator</CardTitle>
              </div>
              <CardDescription>
                Calculate equity terms and investment metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analyze investment terms, calculate cap tables, and model various scenarios 
                for your deals.
              </p>
            </CardContent>
            <CardFooter className="border-t pt-4 pb-2">
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
                <Info className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
          
          {/* Document Scanner Card - Coming Soon */}
          <Card className="opacity-75">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded text-primary">
                  <FileSearch size={24} />
                </div>
                <CardTitle>Document Scanner</CardTitle>
              </div>
              <CardDescription>
                Extract key terms from legal documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatically identify and extract important terms, conditions, and contract details
                from your legal documents.
              </p>
            </CardContent>
            <CardFooter className="border-t pt-4 pb-2">
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
                <Info className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}