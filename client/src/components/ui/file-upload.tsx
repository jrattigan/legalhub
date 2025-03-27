import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, File, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { convertFileToBase64 } from '@/lib/file-helpers';

type FileUploadProps = {
  onUpload: (fileData: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileContent: string;
    comment: string;
  }) => void;
  isUploading: boolean;
  documentTitle?: string;
};

export function FileUpload({ onUpload, isUploading, documentTitle }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // For the purposes of this demo, we'll simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 300);

      // Convert file to base64 for demo purposes
      // In a real app, you'd use FormData and multipart/form-data
      const base64 = await convertFileToBase64(selectedFile);

      // Clear the interval once we have the base64
      clearInterval(interval);
      setUploadProgress(100);

      onUpload({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        fileContent: base64,
        comment: comment
      });

      // Reset state after upload
      setSelectedFile(null);
      setComment('');
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
          selectedFile ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClickUpload}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx"
        />
        
        {selectedFile ? (
          <Card className="relative py-2">
            <CardContent className="p-4 flex items-center">
              <File className="h-8 w-8 text-primary mr-3" />
              <div className="flex-1 overflow-hidden">
                <div className="font-medium truncate">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-2" 
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="py-4">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <div className="font-medium">
              Drag and drop file here or click to browse
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Supports PDF, Word, Excel, PowerPoint, and text files
            </p>
          </div>
        )}
      </div>

      {documentTitle && (
        <div className="text-sm text-muted-foreground">
          Uploading new version for: <span className="font-medium">{documentTitle}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="comment">Version Comment</Label>
        <Textarea
          id="comment"
          placeholder="Describe the changes in this version..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="resize-none"
          rows={3}
        />
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      <Button 
        onClick={handleUpload} 
        disabled={!selectedFile || isUploading} 
        className="w-full"
      >
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </div>
  );
}
