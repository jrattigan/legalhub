import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Accept, useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { X, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  id?: string;
  documentTitle?: string;
  isUploading?: boolean;
  onUpload: (fileData: {
    fileName: string;
    fileContent: string;
    fileSize: number;
    fileType: string;
  }) => void;
  dropzoneOptions?: {
    maxSize?: number;
    accept?: Accept;
  };
  className?: string;
}

export function FileUpload({
  id,
  documentTitle,
  onUpload,
  isUploading = false,
  dropzoneOptions,
  className,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setError(null);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: dropzoneOptions?.maxSize || 1024 * 1024 * 10, // Default 10MB
    accept: dropzoneOptions?.accept,
    multiple: false,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
  };

  const handleUpload = async (e: React.MouseEvent) => {
    // Prevent the default form submission behavior
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedFile) return;
    
    try {
      console.log("Processing file for upload:", selectedFile.name);
      
      // Read the file as base64
      const fileReader = new FileReader();
      fileReader.readAsDataURL(selectedFile);
      
      fileReader.onload = async () => {
        // Extract the base64 content from the data URL
        const base64Content = fileReader.result as string;
        const base64Data = base64Content.split(',')[1]; // Remove the data:application/type;base64, prefix
        
        console.log("File read successfully, calling onUpload function");
        
        // Call onUpload with file data
        onUpload({
          fileName: documentTitle || selectedFile.name,
          fileContent: base64Data,
          fileSize: selectedFile.size,
          fileType: selectedFile.type
        });
      };
      
      fileReader.onerror = () => {
        setError('Error reading the file');
      };
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing file');
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        id={id}
        className={cn(
          'border-2 border-dashed rounded-md cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted hover:border-primary hover:bg-muted/5',
          className
        )}
      >
        <input {...getInputProps()} />
        
        {selectedFile ? (
          <Card className="shadow-none border-0 bg-transparent">
            <CardContent className="p-4 flex items-center">
              <FileText className="h-8 w-8 text-primary mr-3" />
              <div className="flex-1 overflow-hidden">
                <div className="font-medium truncate">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-2" 
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <div className="font-medium">
              {isDragActive ? "Drop file here" : "Drag and drop file here or click to browse"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select a document to upload
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      {selectedFile && (
        <Button 
          onClick={handleUpload} 
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? "Uploading..." : "Upload Document"}
        </Button>
      )}
    </div>
  );
}