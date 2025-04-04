import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Download, Eye, Split, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
  onReset,
}: RedlineCompareViewProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  
  // Function to download the comparison result
  const downloadComparison = () => {
    // Create HTML content with styling
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document Comparison - ${originalFile?.name || 'Original'} vs ${newFile?.name || 'New'}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    .info { margin-bottom: 20px; color: #555; }
    .document-diff { margin-top: 20px; }
    .bg-green-100 { background-color: #dcfce7; color: #166534; padding: 2px 0; }
    .bg-red-100 { background-color: #fee2e2; color: #991b1b; text-decoration: line-through; padding: 2px 0; }
    .comparison-meta { margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; }
    .document-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .document-panel { border: 1px solid #e5e7eb; padding: 15px; border-radius: 5px; }
    h2 { font-size: 18px; margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
  </style>
</head>
<body>
  <div class="comparison-meta">
    <h1>Document Comparison</h1>
    <div class="info">
      <p>Original Document: ${originalFile?.name || 'Unknown'}</p>
      <p>New Document: ${newFile?.name || 'Unknown'}</p>
      <p>Comparison Date: ${new Date().toLocaleString()}</p>
    </div>
  </div>
  
  ${viewMode === 'unified' ? 
    `<div class="document-diff">${diff}</div>` : 
    `<div class="document-container">
      <div class="document-panel">
        <h2>Original Document</h2>
        <div>${contentV1.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="document-panel">
        <h2>New Document</h2>
        <div>${contentV2.replace(/\n/g, '<br>')}</div>
      </div>
    </div>`
  }
</body>
</html>
    `;
    
    // Create a blob with the content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${originalFile?.name || 'document1'}_vs_${newFile?.name || 'document2'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comparison Results</CardTitle>
              <CardDescription>
                Comparing {originalFile?.name} with {newFile?.name}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setViewMode('unified')}>
                <Eye className="h-4 w-4 mr-1" />
                Unified View
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewMode('split')}>
                <Split className="h-4 w-4 mr-1" />
                Split View
              </Button>
              <Button variant="outline" size="sm" onClick={downloadComparison}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onReset}>
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-6">
          {viewMode === 'unified' ? (
            <div className="border rounded-md p-4 bg-background">
              <h3 className="text-lg font-medium mb-4">Unified View</h3>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: diff }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md p-4 bg-background">
                <h3 className="text-lg font-medium mb-4">Original Document</h3>
                <div className="whitespace-pre-wrap">{contentV1}</div>
              </div>
              <div className="border rounded-md p-4 bg-background">
                <h3 className="text-lg font-medium mb-4">New Document</h3>
                <div className="whitespace-pre-wrap">{contentV2}</div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="border-t pt-4 flex justify-between">
          <Button variant="outline" onClick={onReset}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <Button variant="default" onClick={downloadComparison}>
            <Download className="h-4 w-4 mr-2" />
            Download Comparison
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}