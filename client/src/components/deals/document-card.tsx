import React, { useState } from 'react';
import { 
  FileText, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Download, 
  Edit, 
  History, 
  Copy, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal 
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Document, DocumentVersion } from '@shared/schema';
import { FileUpload } from '@/components/ui/file-upload';
import { apiRequest } from '@/lib/queryClient';
import { DocumentCompare } from '@/components/ui/document-compare';

interface DocumentCardProps {
  document: Document & { versions: number };
  onRefreshData: () => void;
  preview?: boolean;
}

export default function DocumentCard({ document, onRefreshData, preview = false }: DocumentCardProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    version1?: DocumentVersion & { uploadedBy: any };
    version2?: DocumentVersion & { uploadedBy: any };
    diff?: string;
  }>({});

  // Fetch document versions
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: [`/api/documents/${document.id}/versions`],
    enabled: isExpanded
  });

  // Upload new version mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/documents/${document.id}/versions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${document.id}/versions`] });
      setIsUploadDialogOpen(false);
      onRefreshData();
    }
  });

  // Compare versions mutation
  const compareMutation = useMutation({
    mutationFn: async ({ version1Id, version2Id }: { version1Id: number, version2Id: number }) => {
      const response = await fetch(`/api/document-versions/compare?version1=${version1Id}&version2=${version2Id}`);
      if (!response.ok) {
        throw new Error('Failed to compare versions');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (versions && versions.length >= 2) {
        setCompareVersions({
          version1: versions[1],
          version2: versions[0],
          diff: data.diff
        });
        setCompareDialogOpen(true);
      }
    }
  });

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Final':
      case 'Final Draft':
        return 'bg-secondary-light text-secondary';
      case 'Review':
        return 'bg-warning-light text-warning';
      case 'Action Required':
        return 'bg-destructive-light text-destructive';
      case 'Draft':
        return 'bg-neutral-200 text-neutral-600';
      default:
        return 'bg-neutral-200 text-neutral-600';
    }
  };

  const handleCompareLatestVersions = () => {
    if (versions && versions.length >= 2) {
      compareMutation.mutate({
        version1Id: versions[1].id,
        version2Id: versions[0].id
      });
    }
  };

  return (
    <div className="border border-neutral-200 rounded-md overflow-hidden">
      <div 
        className={`p-3 bg-white hover:bg-neutral-50 cursor-pointer ${isExpanded ? 'bg-neutral-50' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary-light rounded flex items-center justify-center text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="ml-3">
              <div className="font-medium text-sm">{document.title}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                <span>{document.category}</span>
                <span className="mx-1">•</span>
                <span>{document.versions} versions</span>
                <span className="mx-1">•</span>
                <span>Updated {format(new Date(document.updatedAt), 'MMM d')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${getStatusBadgeClasses(document.status)}`}>
              {document.status}
            </span>
            {document.assigneeId && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {document.assigneeId}
                </AvatarFallback>
              </Avatar>
            )}
            {isExpanded ? (
              <ChevronUp className="ml-2 text-neutral-400 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 text-neutral-400 h-4 w-4" />
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-neutral-100 p-3 bg-neutral-50">
          <div className="flex mb-3 gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <History className="h-3.5 w-3.5 mr-1" />
              History
            </Button>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs text-primary border-primary">
                  <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                  Upload New Version
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Upload New Version</DialogTitle>
                  <DialogDescription>
                    Upload a new version of "{document.title}"
                  </DialogDescription>
                </DialogHeader>
                <FileUpload
                  documentTitle={document.title}
                  onUpload={(fileData) => uploadMutation.mutate({
                    ...fileData,
                    uploadedById: 1 // For demo purposes, use first user
                  })}
                  isUploading={uploadMutation.isPending}
                />
              </DialogContent>
            </Dialog>
            {(versions?.length || 0) >= 2 && (
              <Button
                variant="outline" 
                size="sm" 
                className="text-xs text-primary border-primary"
                onClick={handleCompareLatestVersions}
                disabled={compareMutation.isPending}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Compare Versions
              </Button>
            )}
          </div>
          
          <div className="bg-white rounded border border-neutral-200 p-2">
            <div className="text-xs font-medium mb-2">Version History</div>
            
            {versionsLoading ? (
              <div className="text-center py-2 text-sm text-neutral-500">Loading versions...</div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-2">
                {versions.map((version: DocumentVersion & { uploadedBy: any }) => (
                  <div key={version.id} className="flex justify-between items-center py-1 border-b border-neutral-100 last:border-b-0 text-xs">
                    <div className="flex items-center">
                      <Avatar className="h-5 w-5 mr-2" style={{ backgroundColor: version.uploadedBy.avatarColor }}>
                        <AvatarFallback className="text-[10px]">{version.uploadedBy.initials}</AvatarFallback>
                      </Avatar>
                      <span>v{version.version} - {version.comment || 'No comment'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-neutral-500">{format(new Date(version.createdAt), 'MMM d, yyyy')}</span>
                      <div className="flex space-x-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-sm text-neutral-500">No versions available</div>
            )}
          </div>
        </div>
      )}

      {/* Document comparison dialog */}
      {compareDialogOpen && compareVersions.version1 && compareVersions.version2 && compareVersions.diff && (
        <DocumentCompare
          originalVersion={compareVersions.version1}
          newVersion={compareVersions.version2}
          diff={compareVersions.diff}
          onClose={() => setCompareDialogOpen(false)}
        />
      )}
    </div>
  );
}
