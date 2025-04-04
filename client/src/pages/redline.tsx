import React, { useState, useRef } from 'react';
import AppLayout from '../components/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Upload, FileText, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import RedlineCompareView from '../components/tools/redline-compare-view';

export default function RedlinePage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<{ 
    diff: string; 
    contentV1: string;
    contentV2: string;
  } | null>(null);
  
  const originalFileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  
  const clearFiles = () => {
    setOriginalFile(null);
    setNewFile(null);
    setError(null);
    setCompareResult(null);
    setComparing(false);
    
    // Reset file input values
    if (originalFileInputRef.current) originalFileInputRef.current.value = '';
    if (newFileInputRef.current) newFileInputRef.current.value = '';
  };
  
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      // Check file type
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedTypes = ['txt', 'doc', 'docx', 'rtf', 'pdf'];
      
      if (allowedTypes.includes(fileExtension || '')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError(`File type not supported. Please upload a ${allowedTypes.join(', ')} file.`);
        e.target.value = '';
      }
    }
  };
  
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };
  
  const compareDocuments = async () => {
    if (!originalFile || !newFile) {
      setError('Please select both original and new documents.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Read both files
      const originalContent = await readFileAsText(originalFile);
      const newContent = await readFileAsText(newFile);
      
      // Prepare file data for API
      const originalFileData = {
        name: originalFile.name,
        content: originalContent,
        type: originalFile.type
      };
      
      const newFileData = {
        name: newFile.name,
        content: newContent,
        type: newFile.type
      };
      
      // Make API request
      const response = await fetch('/api/tools/redline/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalFileData,
          newFileData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error comparing documents: ${response.statusText}`);
      }
      
      const result = await response.json();
      setCompareResult(result);
      setComparing(true);
      
      toast({
        title: "Comparison Complete",
        description: "Documents have been successfully compared.",
        variant: "default",
      });
    } catch (err) {
      console.error('Error comparing documents:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      toast({
        title: "Comparison Failed",
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleReset = () => {
    clearFiles();
  };
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center">
          <Link href="/tools">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Tools
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Redline Tool</h1>
        </div>
        
        {!comparing ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Compare Documents</CardTitle>
                <CardDescription>
                  Upload two versions of a document to see the differences highlighted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="originalFile" className="mb-2 block">Original Document</Label>
                    <div className="relative">
                      <Input
                        id="originalFile"
                        ref={originalFileInputRef}
                        type="file"
                        accept=".txt,.doc,.docx,.rtf,.pdf"
                        onChange={(e) => handleFileChange(e, setOriginalFile)}
                        className="cursor-pointer"
                      />
                    </div>
                    {originalFile && (
                      <div className="mt-2 flex items-center text-sm text-muted-foreground">
                        <FileText className="mr-1 h-4 w-4" />
                        <span className="truncate max-w-[240px]">{originalFile.name}</span>
                        <Check className="ml-1 h-4 w-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="newFile" className="mb-2 block">New Document</Label>
                    <div className="relative">
                      <Input
                        id="newFile"
                        ref={newFileInputRef}
                        type="file"
                        accept=".txt,.doc,.docx,.rtf,.pdf"
                        onChange={(e) => handleFileChange(e, setNewFile)}
                        className="cursor-pointer"
                      />
                    </div>
                    {newFile && (
                      <div className="mt-2 flex items-center text-sm text-muted-foreground">
                        <FileText className="mr-1 h-4 w-4" />
                        <span className="truncate max-w-[240px]">{newFile.name}</span>
                        <Check className="ml-1 h-4 w-4 text-green-500" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Supported file types: .txt, .doc, .docx, .rtf, .pdf</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={clearFiles} disabled={loading}>
                  Clear
                </Button>
                <Button 
                  onClick={compareDocuments} 
                  disabled={!originalFile || !newFile || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Compare Documents
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Upload your original document (the older version).</li>
                  <li>Upload the new document (the updated version).</li>
                  <li>Click "Compare Documents" to generate the redline comparison.</li>
                  <li>View the result with changes highlighted in color:
                    <ul className="list-disc list-inside ml-4 mt-1 text-sm">
                      <li><span className="text-green-600">Added text</span> will be highlighted in green.</li>
                      <li><span className="text-red-600">Deleted text</span> will be crossed out in red.</li>
                      <li><span className="text-amber-600">Modified sections</span> will be highlighted in yellow/orange.</li>
                    </ul>
                  </li>
                  <li>You can toggle between unified view and side-by-side view.</li>
                  <li>Download the comparison result for offline reference or sharing.</li>
                </ol>
              </CardContent>
            </Card>
          </>
        ) : (
          compareResult && (
            <RedlineCompareView
              originalFile={originalFile}
              newFile={newFile}
              diff={compareResult.diff}
              contentV1={compareResult.contentV1}
              contentV2={compareResult.contentV2}
              onReset={handleReset}
            />
          )
        )}
      </div>
    </AppLayout>
  );
}