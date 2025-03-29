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
  MoreHorizontal,
  Plus 
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
import { DocumentCompare } from '@/components/ui/document-compare-new';
import { useToast } from '@/hooks/use-toast';

interface DocumentCardProps {
  documents?: (Document & { versions: number })[];
  document?: Document & { versions: number };
  onRefreshData: () => void;
  preview?: boolean;
  dealId?: number;
}

export default function DocumentCard({ document, documents = [], onRefreshData, preview = false, dealId }: DocumentCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [isNewDocDialogOpen, setIsNewDocDialogOpen] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    version1?: DocumentVersion & { uploadedBy: any };
    version2?: DocumentVersion & { uploadedBy: any };
    diff?: string;
    contentV1?: string;
    contentV2?: string;
    aiSummary?: {
      significant_changes: Array<{
        section: string;
        change_type: string;
        description: string;
        significance: string;
      }>;
      unchanged_sections: string[];
      summary: string;
    };
  }>({});

  // If this is a list view with no documents
  if (documents.length === 0 && !document) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 col-span-full">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium text-neutral-800">Documents</h2>
          <Dialog open={isNewDocDialogOpen} onOpenChange={setIsNewDocDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="link" className="text-xs text-primary hover:text-primary-dark" disabled={!dealId}>
                + Add Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogDescription>
                  Add a new document to this deal
                </DialogDescription>
              </DialogHeader>
              <FileUpload
                onUpload={async (fileData) => {
                  // Create a new document with the uploaded file data
                  try {
                    await apiRequest('POST', '/api/documents', {
                      title: fileData.fileName,
                      dealId: dealId,
                      description: "Uploaded document",
                      category: "Primary",
                      status: "Draft",
                      fileType: fileData.fileType,
                      assigneeId: null
                    });
                    
                    setIsNewDocDialogOpen(false);
                    onRefreshData();
                  } catch (error) {
                    console.error("Error creating document:", error);
                  }
                }}
                isUploading={false}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="text-center py-8 text-neutral-500">
          <div className="mb-2">No documents found for this deal</div>
          {dealId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsNewDocDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> 
              Upload First Document
            </Button>
          )}
        </div>
      </div>
    );
  }

  // If we don't have a document, return null
  if (!document) return null;

  // Fetch document versions
  const { data: versions = [], isLoading: versionsLoading } = useQuery<(DocumentVersion & { uploadedBy: any })[]>({
    queryKey: [`/api/document-versions/document/${document.id}`],
    enabled: isExpanded
  });

  // Upload new version mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/documents/${document.id}/versions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/document-versions/document/${document.id}`] });
      setIsUploadDialogOpen(false);
      onRefreshData();
    }
  });

  // Compare versions mutation
  const compareMutation = useMutation({
    mutationFn: async ({ version1Id, version2Id }: { version1Id: number, version2Id: number }) => {
      console.log("Calling comparison API with:", {version1Id, version2Id});
      const response = await fetch(`/api/document-versions/compare?version1=${version1Id}&version2=${version2Id}`);
      
      // Get response text first
      const responseText = await response.text();
      console.log("Raw API response:", responseText.substring(0, 100) + "...");
      
      if (!response.ok) {
        throw new Error('Failed to compare versions');
      }
      
      try {
        // Then try to parse it as JSON
        const result = JSON.parse(responseText);
        console.log("Parsed API response:", result);
        return result;
      } catch (e) {
        console.error("Error parsing response as JSON:", e);
        throw new Error('Invalid response format from server');
      }
    },
    onSuccess: (data) => {
      console.log("Comparison success, setting state with:", {data});
      if (versions && versions.length >= 2) {
        // First open the dialog
        setCompareDialogOpen(true);
        
        // Then set the data (this ensures dialog shows even if there's an issue with the data)
        setCompareVersions({
          version1: versions[1],
          version2: versions[0],
          diff: data.diff || "<div>No differences detected</div>",
          contentV1: data.contentV1 || versions[1].fileContent,
          contentV2: data.contentV2 || versions[0].fileContent,
          aiSummary: data.aiSummary
        });
      }
    },
    onError: (error) => {
      console.error("Comparison mutation error:", error);
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to compare document versions. Please try again.",
        variant: "destructive"
      });
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

  const handleCompareLatestVersions = (e: React.MouseEvent) => {
    // Stop propagation to prevent the isExpanded toggle
    e.stopPropagation();
    
    if (versions && versions.length >= 2) {
      // Log for debugging
      console.log("Comparing versions:", {
        version1: versions[1],
        version2: versions[0]
      });
      
      // Ensure we have valid IDs before triggering the mutation
      if (versions[1]?.id && versions[0]?.id) {
        compareMutation.mutate({
          version1Id: versions[1].id,
          version2Id: versions[0].id
        });
      } else {
        console.error("Invalid version IDs", versions);
      }
    } else {
      console.error("Not enough versions to compare", versions);
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
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                // Get the latest version if available
                if (versions && versions.length > 0) {
                  const latestVersion = versions[0];
                  // In a real app, this would download the actual file
                  // For now, we'll just show a success toast
                  toast({
                    title: "Download Started",
                    description: `Downloading ${document.title} (version ${latestVersion.version})`,
                    duration: 3000,
                  });
                  // This approach would be used in a real implementation:
                  // window.open(`/api/document-versions/${latestVersion.id}/download`, '_blank');
                }
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                // In a real app, this would open the document in an editor
                toast({
                  title: "Edit Document",
                  description: `Opening ${document.title} for editing`,
                  duration: 3000,
                });
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                // In a real app, this would show a more detailed history view
                // For now, we just ensure the version history is visible
                if (!isExpanded) {
                  setIsExpanded(true);
                }
                // Scroll to the version history section
                setTimeout(() => {
                  // Using document from window object, not the document prop
                  const historyElement = window.document.querySelector('.version-history-section');
                  if (historyElement) {
                    historyElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
              }}
            >
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
                {compareMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Compare Versions
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="bg-white rounded border border-neutral-200 p-2 version-history-section">
            <div className="text-xs font-medium mb-2">Version History</div>
            
            {versionsLoading ? (
              <div className="text-center py-2 text-sm text-neutral-500">Loading versions...</div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-2">
                {versions.map((version) => (
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            // In a real app, this would open a viewer for this specific version
                            toast({
                              title: "View Document",
                              description: `Viewing version ${version.version} of ${document.title}`,
                              duration: 3000,
                            });
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            // In a real app, this would download this specific version
                            toast({
                              title: "Download Started",
                              description: `Downloading version ${version.version} of ${document.title}`,
                              duration: 3000,
                            });
                            // Actual implementation would be:
                            // window.open(`/api/document-versions/${version.id}/download`, '_blank');
                          }}
                        >
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
      {compareDialogOpen && compareVersions.version1 && compareVersions.version2 && (
        <DocumentCompare
          originalVersion={compareVersions.version1}
          newVersion={compareVersions.version2}
          diff={compareVersions.diff || "<div>Diff data not available</div>"}
          contentV1={compareVersions.contentV1}
          contentV2={compareVersions.contentV2}
          aiSummary={compareVersions.aiSummary}
          onClose={() => setCompareDialogOpen(false)}
        />
      )}
    </div>
  );
}
