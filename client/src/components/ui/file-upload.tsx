import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Accept, useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { X, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  id?: string;
  value: File | null;
  onValueChange: (file: File | null) => void;
  dropzoneOptions?: {
    maxSize?: number;
    accept?: Accept;
  };
  className?: string;
}

export function FileUpload({
  id,
  value,
  onValueChange,
  dropzoneOptions,
  className,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onValueChange(acceptedFiles[0]);
      }
    },
    [onValueChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: dropzoneOptions?.maxSize || 1024 * 1024 * 10, // Default 10MB
    accept: dropzoneOptions?.accept,
    multiple: false,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(null);
  };

  return (
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
      
      {value ? (
        <Card className="shadow-none border-0 bg-transparent">
          <CardContent className="p-4 flex items-center">
            <FileText className="h-8 w-8 text-primary mr-3" />
            <div className="flex-1 overflow-hidden">
              <div className="font-medium truncate">{value.name}</div>
              <div className="text-xs text-muted-foreground">
                {(value.size / 1024).toFixed(0)} KB
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
            Select a document to compare
          </p>
        </div>
      )}
    </div>
  );
}