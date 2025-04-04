import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, RefreshCw, ArrowLeft, ArrowRight, PanelLeftOpen, PanelRightOpen } from 'lucide-react';

interface RedlineCompareViewProps {
  originalFile: File | null;
  newFile: File | null;
  diff: string;
  contentV1: string;
  contentV2: string;
  onReset: () => void;
}

export default function RedlineCompareView({
  originalFile,
  newFile,
  diff,
  contentV1,
  contentV2,
  onReset
}: RedlineCompareViewProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>('unified');
  
  // Function to download the diff as HTML
  const downloadDiff = () => {
    // Create a blob with the HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redline Comparison</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .info { margin-bottom: 20px; }
        .file-info { margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Document Comparison</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
      <div class="info">
        <div class="file-info">
          <strong>Original Document:</strong> ${originalFile?.name || 'Unknown'}
        </div>
        <div class="file-info">
          <strong>New Document:</strong> ${newFile?.name || 'Unknown'}
        </div>
      </div>
      ${diff}
    </body>
    </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and click it to download
    const a = document.createElement('a');
    a.href = url;
    a.download = `redline-comparison-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      {/* File info and actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Comparison Results</CardTitle>
          <CardDescription>
            Comparing {originalFile?.name} with {newFile?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Original Document</span>
                <span className="text-xs text-muted-foreground">{originalFile?.name}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">New Document</span>
                <span className="text-xs text-muted-foreground">{newFile?.name}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'unified' ? 'side-by-side' : 'unified')}
              >
                {viewMode === 'unified' ? (
                  <>
                    <PanelLeftOpen className="mr-2 h-4 w-4" />
                    Side by Side
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="mr-2 h-4 w-4" />
                    Unified View
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadDiff}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={onReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                New Comparison
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* View modes */}
      {viewMode === 'unified' ? (
        // Unified view - changes highlighted inline
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <div 
              className="p-6 max-h-[800px] overflow-auto bg-white rounded-md"
              dangerouslySetInnerHTML={{ __html: diff }}
            />
          </CardContent>
        </Card>
      ) : (
        // Side-by-side view
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border shadow-sm">
            <CardHeader className="py-3 px-4 border-b bg-gray-50">
              <CardTitle className="text-sm font-medium">Original Document</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="p-6 h-[700px] overflow-auto font-mono text-sm whitespace-pre-wrap bg-white"
              >
                {contentV1 || "No content available"}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardHeader className="py-3 px-4 border-b bg-gray-50">
              <CardTitle className="text-sm font-medium">New Document</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="p-6 h-[700px] overflow-auto font-mono text-sm whitespace-pre-wrap bg-white"
              >
                {contentV2 || "No content available"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Key for understanding the changes */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Color Key</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 rounded bg-green-100 border border-green-300"></div>
              <span>Added content <span className="text-green-700">(green)</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 rounded bg-red-100 border border-red-300"></div>
              <span>Deleted content <span className="text-red-700">(red)</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 rounded bg-amber-100 border border-amber-300"></div>
              <span>Modified sections <span className="text-amber-700">(yellow)</span></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}