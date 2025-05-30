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
import { DocumentCompareDirect } from '@/components/ui/document-compare-direct';
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
    docData1?: any;
    docData2?: any;
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
                    // Use an absolute URL to avoid path issues
                    const apiUrl = window.location.origin + '/api/documents';
                    await apiRequest(apiUrl, {
                      method: 'POST',
                      data: {
                        title: fileData.fileName,
                        dealId: dealId,
                        description: "Uploaded document",
                        category: "Primary",
                        status: "Draft",
                        fileType: fileData.fileType,
                        assigneeId: null
                      }
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

  // Fetch document versions with refetch function
  const { 
    data: versions = [], 
    isLoading: versionsLoading,
    refetch: refetchVersions 
  } = useQuery<(DocumentVersion & { uploadedBy: any })[]>({
    queryKey: [`/api/document-versions/document/${document.id}`], // Remove window.location.origin for consistency
    enabled: isExpanded
  });

  // Upload new version mutation setup for UI state
  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      // This is now just a placeholder for UI state tracking
      return { success: true };
    },
    onSuccess: () => {
      // We'll manually manage this in the handleDocumentUpload function
    }
  });
  
  // Specialized document upload handler that uses XMLHttpRequest for reliable POST requests
  const handleDocumentUpload = async (fileData: any) => {
    try {
      // Start loading state
      uploadMutation.reset();
      uploadMutation.mutate({}); // This triggers isPending state to true
      
      console.log(`Starting direct XMLHttpRequest upload to document ID: ${document.id}`);
      
      // Get the base URL - this is important to avoid wrong URL construction
      const baseURL = window.location.origin || '';
      const apiUrl = `${baseURL}/api/documents/${document.id}/versions`;
      console.log(`Making POST request to ${apiUrl} via XMLHttpRequest`);
      
      // Create a new XMLHttpRequest - this approach worked in our test page
      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      // Set up completion handlers
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log("Upload successful, response:", xhr.responseText);
          
          // Success handling
          toast({
            title: "Upload Successful",
            description: "Document version has been uploaded successfully.",
            duration: 3000,
          });
          
          // Update UI and queries - Fixed to invalidate all document-related cache
          queryClient.invalidateQueries({ queryKey: ['api'] }); // Invalidate all API queries to ensure refresh
          
          // Also manually refetch the document versions to update the UI
          if (isExpanded) {
            refetchVersions();
          }
          
          setIsUploadDialogOpen(false);
          onRefreshData();
          uploadMutation.reset(); // Reset pending state
        } else {
          console.error("Upload failed with status:", xhr.status, xhr.responseText);
          
          // Error handling
          toast({
            title: "Upload Failed",
            description: "There was an error uploading your document. Please try again.",
            variant: "destructive"
          });
          uploadMutation.reset(); // Reset pending state
        }
      };
      
      xhr.onerror = function() {
        console.error("Network error during upload");
        toast({
          title: "Upload Failed",
          description: "Network error while uploading. Please try again.",
          variant: "destructive"
        });
        uploadMutation.reset(); // Reset pending state
      };
      
      // Add user ID to the file data
      const uploadData = {
        ...fileData,
        uploadedById: 1 // For demo purposes, use first user
      };
      
      console.log("Sending document data via XMLHttpRequest");
      xhr.send(JSON.stringify(uploadData));
      
    } catch (error) {
      console.error("Error in document upload handler:", error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      uploadMutation.reset(); // Reset pending state
    }
  };

  // Compare versions mutation using XMLHttpRequest for consistency
  const compareMutation = useMutation({
    mutationFn: async ({ version1Id, version2Id }: { version1Id: number, version2Id: number }) => {
      console.log("Calling comparison API with XMLHttpRequest:", {version1Id, version2Id});
      
      // Get the base URL - this is important to avoid wrong URL construction
      const baseURL = window.location.origin || '';
      const apiUrl = `${baseURL}/api/document-versions/compare?version1=${version1Id}&version2=${version2Id}`;
      console.log(`Making GET request to ${apiUrl} via XMLHttpRequest`);
      
      // Create promise wrapper for XMLHttpRequest
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', apiUrl, true);
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              console.log("Raw API response:", xhr.responseText.substring(0, 100) + "...");
              const result = JSON.parse(xhr.responseText);
              console.log("Parsed API response:", result);
              resolve(result);
            } catch (e) {
              console.error("Error parsing response as JSON:", e);
              reject(new Error('Invalid response format from server'));
            }
          } else {
            reject(new Error('Failed to compare versions'));
          }
        };
        
        xhr.onerror = function() {
          console.error("Network error during comparison request");
          reject(new Error('Network error during comparison request'));
        };
        
        xhr.send();
      });
    },
    onSuccess: (data: any) => {
      console.log("Comparison success, setting state with:", {data});
      if (versions && versions.length >= 2) {
        // First open the dialog
        setCompareDialogOpen(true);
        
        // Then set the data (this ensures dialog shows even if there's an issue with the data)
        setCompareVersions({
          version1: versions[1],
          version2: versions[0],
          diff: data?.diff || "<div>No differences detected</div>",
          docData1: data?.docData1 || { 
            id: versions[1].id,
            version: versions[1].version,
            fileName: versions[1].fileName,
            contentType: versions[1].fileType,
            fileSize: versions[1].fileSize,
            createdAt: versions[1].createdAt,
            documentId: versions[1].documentId
          },
          docData2: data?.docData2 || {
            id: versions[0].id,
            version: versions[0].version,
            fileName: versions[0].fileName,
            contentType: versions[0].fileType,
            fileSize: versions[0].fileSize,
            createdAt: versions[0].createdAt,
            documentId: versions[0].documentId
          },
          aiSummary: data?.aiSummary
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
    <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md">
      <div 
        className={`p-4 bg-white hover:bg-neutral-50 cursor-pointer transition-colors ${isExpanded ? 'bg-neutral-50 border-b border-neutral-100' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <div className="font-medium text-neutral-800">{document.title}</div>
              <div className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center">
                <span className="inline-block px-2 py-0.5 bg-neutral-100 rounded-md mr-2 mb-1">{document.category}</span>
                <span className="mr-2 mb-1">{document.versions} versions</span>
                <span className="flex items-center mb-1">
                  <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full mr-1.5"></span>
                  Updated {format(new Date(document.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full mr-3 ${getStatusBadgeClasses(document.status)}`}>
              {document.status}
            </span>
            {document.assigneeId && (
              <Avatar className="h-8 w-8 ring-2 ring-white">
                <AvatarFallback className="text-xs font-medium">
                  {document.assigneeId}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="ml-2 p-1 rounded-full hover:bg-neutral-100 transition-colors">
              {isExpanded ? (
                <ChevronUp className="text-neutral-500 h-5 w-5" />
              ) : (
                <ChevronDown className="text-neutral-500 h-5 w-5" />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-5 bg-white">
          <div className="flex mb-5 gap-2 flex-wrap justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm font-medium bg-white hover:bg-neutral-50 transition-colors"
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
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm font-medium bg-white hover:bg-neutral-50 transition-colors"
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
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="text-sm font-medium">
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
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
                    onUpload={(fileData) => {
                      console.log("FileUpload component triggered onUpload with data");
                      // Instead of using react-query's mutation here, we'll handle the fetch directly
                      handleDocumentUpload(fileData);
                    }}
                    isUploading={uploadMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
              
              {(versions?.length || 0) >= 2 && (
                <Button
                  variant="secondary" 
                  size="sm" 
                  className="text-sm font-medium"
                  onClick={handleCompareLatestVersions}
                  disabled={compareMutation.isPending}
                >
                  {compareMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Compare Versions
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          <div className="rounded-lg shadow-sm border border-neutral-200 overflow-hidden version-history-section">
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
              <div className="font-medium text-neutral-800 flex items-center">
                <History className="h-4 w-4 mr-2 text-neutral-500" />
                Version History
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-neutral-500">
                View Full History
              </Button>
            </div>
            
            <div className="divide-y divide-neutral-100">
              {versionsLoading ? (
                <div className="text-center py-8 text-sm text-neutral-500">
                  <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading version history...
                </div>
              ) : versions && versions.length > 0 ? (
                <div>
                  {versions.map((version) => (
                    <div key={version.id} className="flex justify-between items-center py-3 px-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center">
                        <div className="relative">
                          <Avatar className="h-8 w-8 ring-2 ring-white" style={{ backgroundColor: version.uploadedBy.avatarColor }}>
                            <AvatarFallback className="text-xs font-medium">{version.uploadedBy.initials}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                            <div className="bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                              {version.version}
                            </div>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-sm">{version.uploadedBy.fullName}</div>
                          <div className="text-xs text-neutral-500">{version.comment || 'No comment'}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-xs text-neutral-500 mr-4">{format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}</div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-neutral-100"
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
                            <Eye className="h-4 w-4 text-neutral-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-neutral-100"
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
                            <Download className="h-4 w-4 text-neutral-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-neutral-100"
                          >
                            <MoreHorizontal className="h-4 w-4 text-neutral-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-neutral-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 text-neutral-300" />
                  No versions are available for this document
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document comparison dialog */}
      {compareDialogOpen && compareVersions.version1 && compareVersions.version2 && (
        <DocumentCompareDirect
          originalVersion={compareVersions.version1}
          newVersion={compareVersions.version2}
          diff={compareVersions.diff || "<div>Diff data not available</div>"}
          docData1={compareVersions.docData1}
          docData2={compareVersions.docData2}
          aiSummary={compareVersions.aiSummary}
          onClose={() => setCompareDialogOpen(false)}
        />
      )}
    </div>
  );
}
