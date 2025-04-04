import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import AppLayout from '@/components/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileUpload } from '@/components/ui/file-upload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, FileText, Upload, AlertCircle } from 'lucide-react';
import RedlineCompareView from '@/components/tools/redline-compare-view';
import { useToast } from '@/hooks/use-toast';

export default function RedlinePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for the comparison results
  const [comparisonResult, setComparisonResult] = useState<{
    diff: string;
    contentV1: string;
    contentV2: string;
  } | null>(null);
  
  // Clear all files and reset states
  const handleReset = () => {
    setOriginalFile(null);
    setNewFile(null);
    setComparisonResult(null);
    setError(null);
  };
  
  // Convert a file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extract the base64 part (remove the prefix)
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };
  
  // Handle the comparison action
  const handleCompare = async () => {
    if (!originalFile || !newFile) {
      setError('Please upload both original and new files');
      return;
    }
    
    try {
      setIsComparing(true);
      setError(null);
      
      // Convert files to base64
      const originalFileBase64 = await fileToBase64(originalFile);
      const newFileBase64 = await fileToBase64(newFile);
      
      // Prepare the request body
      const requestData = {
        originalFile: {
          name: originalFile.name,
          content: originalFileBase64,
          type: originalFile.type
        },
        newFile: {
          name: newFile.name,
          content: newFileBase64,
          type: newFile.type
        }
      };
      
      // Send to the API
      const response = await fetch('/api/tools/redline/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compare documents');
      }
      
      const result = await response.json();
      
      // Set the comparison result
      setComparisonResult({
        diff: result.diff,
        contentV1: result.contentV1,
        contentV2: result.contentV2
      });
      
      toast({
        title: 'Comparison Complete',
        description: 'Documents have been compared successfully.',
      });
    } catch (err) {
      console.error('Error comparing documents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      toast({
        title: 'Comparison Failed',
        description: err instanceof Error ? err.message : 'Failed to compare documents',
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
    }
  };
  
  // Check if we have valid files to enable the compare button
  const canCompare = originalFile !== null && newFile !== null;
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              asChild
              className="mb-2 px-0 text-muted-foreground hover:text-foreground"
            >
              <Link href="/tools">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tools
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Redline Tool</h1>
            <p className="text-muted-foreground mt-1">
              Compare documents and visualize changes with highlighted differences
            </p>
          </div>
        </div>
        
        {/* Display the comparison view as a modal overlay if there are results */}
        {comparisonResult && (
          <RedlineCompareView 
            originalFile={originalFile}
            newFile={newFile}
            diff={comparisonResult.diff}
            contentV1={comparisonResult.contentV1}
            contentV2={comparisonResult.contentV2}
            onReset={handleReset}
          />
        )}
        
        {/* Always show the upload UI */}
        <Card>
          <CardHeader>
            <CardTitle>Document Comparison</CardTitle>
            <CardDescription>
              Upload two documents to compare. Changes will be highlighted: additions in green, deletions in red.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Files</TabsTrigger>
                <TabsTrigger value="info">Supported Formats</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="original-file" className="mb-2 block">Original Document</Label>
                    <FileUpload
                      id="original-file"
                      value={originalFile}
                      onValueChange={setOriginalFile}
                      dropzoneOptions={{
                        accept: {
                          'application/msword': ['.doc'],
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                          'application/rtf': ['.rtf'],
                          'text/plain': ['.txt'],
                          'text/html': ['.html', '.htm'],
                          'application/pdf': ['.pdf'],
                        },
                      }}
                    />
                    {originalFile && (
                      <div className="mt-2 flex items-center text-sm text-muted-foreground">
                        <FileText className="mr-2 h-4 w-4" />
                        {originalFile.name} ({Math.round(originalFile.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="new-file" className="mb-2 block">New Document</Label>
                    <FileUpload
                      id="new-file"
                      value={newFile}
                      onValueChange={setNewFile}
                      dropzoneOptions={{
                        accept: {
                          'application/msword': ['.doc'],
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                          'application/rtf': ['.rtf'],
                          'text/plain': ['.txt'],
                          'text/html': ['.html', '.htm'],
                          'application/pdf': ['.pdf'],
                        },
                      }}
                    />
                    {newFile && (
                      <div className="mt-2 flex items-center text-sm text-muted-foreground">
                        <FileText className="mr-2 h-4 w-4" />
                        {newFile.name} ({Math.round(newFile.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleCompare} 
                    disabled={!canCompare || isComparing}
                    className="w-full md:w-auto"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isComparing ? 'Comparing...' : 'Compare Documents'}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="info" className="space-y-4 pt-4">
                <div className="text-sm prose max-w-none">
                  <h3>Supported File Formats</h3>
                  <ul>
                    <li><strong>Microsoft Word:</strong> .doc, .docx</li>
                    <li><strong>Rich Text Format:</strong> .rtf</li>
                    <li><strong>Plain Text:</strong> .txt</li>
                    <li><strong>HTML:</strong> .html, .htm</li>
                    <li><strong>PDF:</strong> .pdf</li>
                  </ul>
                  
                  <h3 className="mt-4">File Size Limits</h3>
                  <p>
                    Files should be less than 10MB each for optimal performance. Larger files may take longer to process.
                  </p>
                  
                  <h3 className="mt-4">How It Works</h3>
                  <p>
                    The Redline tool extracts text content from both documents and performs a word-by-word comparison
                    to identify changes. Additions are highlighted in green, deletions in red.
                  </p>
                  
                  <h3 className="mt-4">Tips</h3>
                  <ul>
                    <li>For best results, compare documents of the same type</li>
                    <li>Complex formatting may be lost during comparison</li>
                    <li>For Word documents, only the text content is compared, not formatting or images</li>
                    <li>PDF comparison focuses on text content; formatting, images, and tables may not be compared accurately</li>
                    <li>For PDFs with complex layout or scanned content, OCR quality may affect comparison results</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}