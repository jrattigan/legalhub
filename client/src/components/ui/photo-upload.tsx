import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type PhotoUploadProps = {
  onUpload: (file: File) => void;
  accept?: string;
  maxSizeInMB?: number;
};

export function PhotoUpload({ 
  onUpload, 
  accept = "image/*", 
  maxSizeInMB = 2 
}: PhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size
      if (file.size > maxSizeInMB * 1024 * 1024) {
        setError(`File size exceeds ${maxSizeInMB}MB limit`);
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check file size
      if (file.size > maxSizeInMB * 1024 * 1024) {
        setError(`File size exceeds ${maxSizeInMB}MB limit`);
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    onUpload(selectedFile);
    clearSelectedFile();
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer ${
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
          accept={accept}
        />
        
        {selectedFile ? (
          <Card className="relative py-2">
            <CardContent className="p-4 flex items-center">
              {previewUrl && (
                <div className="h-12 w-12 rounded-full overflow-hidden mr-3 border border-gray-200">
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
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
          <div className="py-3">
            <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="font-medium text-sm">
              Drag and drop photo here or click to browse
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Supports JPG, PNG and other image formats (max {maxSizeInMB}MB)
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
          className="w-full"
        >
          Upload Photo
        </Button>
      )}
    </div>
  );
}