import React, { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertCircle, Building, Mail, Phone, User, Briefcase, FileText, Calendar, ArrowRight, UserPlus, Edit, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { LawFirm, Attorney, Deal, InsertAttorney } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { format } from "date-fns";
import { convertFileToBase64 } from "@/lib/file-helpers";
import { useIsMobile } from "@/hooks/use-mobile";

// Format phone number consistently - keep outside component to avoid re-definition on each render
const formatPhoneNumber = (phone: string): string => {
  // If no phone number, return empty string
  if (!phone) return '';
  
  // Remove any non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Format consistently as (XXX) XXX-XXXX for 10-digit numbers
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  // Return original format if not a standard 10-digit number
  return phone;
};

// Helper function to format deal titles in a consistent way
const formatDealTitle = (deal: Deal) => {
  return deal.title || 'Untitled Deal';
};

// Status color helper
const getStatusColor = (status: string | null | undefined) => {
  if (!status) return 'bg-gray-100 text-gray-500';
  
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('completed') || statusLower.includes('closed')) {
    return 'bg-green-100 text-green-700';
  } else if (statusLower.includes('in progress') || statusLower.includes('active')) {
    return 'bg-blue-100 text-blue-700';
  } else if (statusLower.includes('pending') || statusLower.includes('waiting')) {
    return 'bg-amber-100 text-amber-700';
  } else if (statusLower.includes('canceled') || statusLower.includes('cancelled') || statusLower.includes('terminated')) {
    return 'bg-red-100 text-red-700';
  }
  
  return 'bg-gray-100 text-gray-700';
};

interface LawFirmDetailViewProps {
  firmId: number;
}

export function LawFirmDetailView({ firmId }: LawFirmDetailViewProps) {
  const { toast } = useToast();
  const [isAddAttorneyOpen, setIsAddAttorneyOpen] = useState(false);
  const [isEditAttorneyOpen, setIsEditAttorneyOpen] = useState(false);
  const [editingAttorney, setEditingAttorney] = useState<Attorney | null>(null);
  const [newAttorney, setNewAttorney] = useState<Partial<InsertAttorney>>({
    name: '',
    position: '',
    email: '',
    phone: '',
    initials: '',
    avatarColor: '#cbd5e1',
  });
  const isMobile = useIsMobile();
  
  // Fetch law firm data
  const { data: lawFirm, isLoading: isLoadingFirm } = useQuery({
    queryKey: ['/api/law-firms', firmId],
    queryFn: async () => {
      const response = await fetch(`/api/law-firms/${firmId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch law firm data');
      }
      return response.json() as Promise<LawFirm>;
    },
  });

  // Fetch attorneys for this law firm
  const { data: attorneys, isLoading: isLoadingAttorneys } = useQuery({
    queryKey: ['/api/law-firms', firmId, 'attorneys'],
    queryFn: async () => {
      const response = await fetch(`/api/law-firms/${firmId}/attorneys`);
      if (!response.ok) {
        throw new Error('Failed to fetch attorneys');
      }
      return response.json() as Promise<Attorney[]>;
    },
  });

  // Fetch deals associated with this law firm
  const { data: deals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['/api/law-firms', firmId, 'deals'],
    queryFn: async () => {
      const response = await fetch(`/api/law-firms/${firmId}/deals`);
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      return response.json() as Promise<Deal[]>;
    },
  });

  // Add attorney mutation
  const addAttorneyMutation = useMutation({
    mutationFn: async (attorney: InsertAttorney) => {
      const response = await fetch(`/api/law-firms/${firmId}/attorneys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attorney),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add attorney');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset the form
      setNewAttorney({
        name: '',
        position: '',
        email: '',
        phone: '',
        initials: '',
        avatarColor: '#cbd5e1',
      });
      
      // Close the dialog
      setIsAddAttorneyOpen(false);
      
      // Show success toast
      toast({
        title: "Attorney Added",
        description: "The attorney has been successfully added to this law firm.",
      });
      
      // Invalidate the query to refetch attorneys
      queryClient.invalidateQueries({ queryKey: ['/api/law-firms', firmId, 'attorneys'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add attorney: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Update attorney mutation
  const updateAttorneyMutation = useMutation({
    mutationFn: async (attorney: Attorney) => {
      const response = await fetch(`/api/attorneys/${attorney.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attorney),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update attorney');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Close the dialog
      setIsEditAttorneyOpen(false);
      
      // Reset the editing attorney
      setEditingAttorney(null);
      
      // Show success toast
      toast({
        title: "Attorney Updated",
        description: "The attorney information has been successfully updated.",
      });
      
      // Invalidate the query to refetch attorneys
      queryClient.invalidateQueries({ queryKey: ['/api/law-firms', firmId, 'attorneys'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update attorney: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Calculate initials from name
  const calculateInitials = (name: string): string => {
    if (!name) return '';
    
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Handle input change for new attorney
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If name is changing, recalculate initials
    if (name === 'name') {
      setNewAttorney((prev) => ({
        ...prev,
        [name]: value,
        initials: calculateInitials(value),
      }));
    } else {
      setNewAttorney((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle input change for editing attorney
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (!editingAttorney) return;
    
    // If name is changing, recalculate initials
    if (name === 'name') {
      setEditingAttorney({
        ...editingAttorney,
        [name]: value,
        initials: calculateInitials(value),
      });
    } else {
      setEditingAttorney({
        ...editingAttorney,
        [name]: value,
      });
    }
  };

  // Handle photo upload for new attorney
  const handlePhotoUpload = async (file: File) => {
    try {
      const photoUrl = await convertFileToBase64(file);
      setNewAttorney((prev) => ({
        ...prev,
        photoUrl,
      }));
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to process the photo. Please try a different image.",
        variant: "destructive",
      });
    }
  };

  // Handle photo upload for editing attorney
  const handleEditPhotoUpload = async (file: File) => {
    if (!editingAttorney) return;
    
    try {
      const photoUrl = await convertFileToBase64(file);
      setEditingAttorney({
        ...editingAttorney,
        photoUrl,
      });
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to process the photo. Please try a different image.",
        variant: "destructive",
      });
    }
  };

  // Handle form submission for adding new attorney
  const handleAddAttorney = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Make sure we have required fields
    if (!newAttorney.name || !newAttorney.email) {
      toast({
        title: "Missing Fields",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Add the law firm ID to the attorney data
    const attorneyData: InsertAttorney = {
      ...newAttorney as Required<InsertAttorney>,
      lawFirmId: firmId,
    };
    
    // Submit the data using the mutation
    addAttorneyMutation.mutate(attorneyData);
  };

  // Handle form submission for editing attorney
  const handleEditAttorney = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAttorney || !editingAttorney.name || !editingAttorney.email) {
      toast({
        title: "Missing Fields",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the updated data
    updateAttorneyMutation.mutate(editingAttorney);
  };

  // Loading state
  if (isLoadingFirm) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-500">Loading law firm information...</p>
        </div>
      </div>
    );
  }

  // Error state - law firm not found
  if (!lawFirm) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Could not find the requested law firm. It may have been deleted or you may not have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* Law firm overview card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start mb-4">
            <div>
              <CardTitle className="text-2xl mb-1">{lawFirm.name}</CardTitle>
              <CardDescription className="text-base">{lawFirm.specialty}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-neutral-500 mr-3" />
              <div>
                <div className="text-sm text-neutral-500 mb-1">Email</div>
                <a href={`mailto:${lawFirm.email}`} className="text-primary hover:underline">
                  {lawFirm.email}
                </a>
              </div>
            </div>

            <div className="flex items-center">
              <Phone className="h-5 w-5 text-neutral-500 mr-3" />
              <div>
                <div className="text-sm text-neutral-500 mb-1">Phone</div>
                <a href={`tel:${lawFirm.phone}`} className="hover:underline">
                  {formatPhoneNumber(lawFirm.phone)}
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attorneys section */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Attorneys</CardTitle>
            <Button
              size="sm" 
              onClick={() => setIsAddAttorneyOpen(true)}
              variant="outline"
              className="h-8"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add Attorney
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoadingAttorneys ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : attorneys && attorneys.length > 0 ? (
              <div className="space-y-4">
                {attorneys.map((attorney) => (
                  <div key={attorney.id} className="flex items-start p-3 rounded-md border border-neutral-200">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Avatar className="h-10 w-10 mr-4 cursor-pointer hover:opacity-90 transition-opacity">
                          {attorney.photoUrl ? (
                            <AvatarImage src={attorney.photoUrl} alt={attorney.name} />
                          ) : (
                            <AvatarFallback 
                              style={{ backgroundColor: attorney.avatarColor || '#cbd5e1' }}
                            >
                              {attorney.initials || attorney.name.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </DialogTrigger>
                      {attorney.photoUrl && (
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{attorney.name}</DialogTitle>
                            <DialogDescription>{attorney.position}</DialogDescription>
                          </DialogHeader>
                          <div className="flex items-center justify-center py-4">
                            <img 
                              src={attorney.photoUrl} 
                              alt={attorney.name} 
                              className="max-h-[400px] max-w-full rounded-md object-cover" 
                            />
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{attorney.name}</div>
                          <div className="text-sm text-neutral-500">{attorney.position}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          title="Edit attorney"
                          onClick={() => {
                            setEditingAttorney(attorney);
                            setIsEditAttorneyOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className={`mt-3 grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2 text-sm`}>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-neutral-500 mr-2" />
                          <a href={`mailto:${attorney.email}`} className="text-primary hover:underline truncate">
                            {attorney.email}
                          </a>
                        </div>
                        {attorney.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-neutral-500 mr-2" />
                            <a href={`tel:${attorney.phone}`} className="hover:underline">
                              <strong>Work:</strong> {formatPhoneNumber(attorney.phone)}
                            </a>
                          </div>
                        )}
                        {attorney.mobile && (
                          <div className={`flex items-center ${isMobile ? '' : 'col-span-2'}`}>
                            <Phone className="w-4 h-4 text-neutral-500 mr-2" />
                            <a href={`tel:${attorney.mobile}`} className="hover:underline">
                              <strong>Mobile:</strong> {formatPhoneNumber(attorney.mobile)}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <User className="h-12 w-12 text-neutral-200 mb-3" />
                <h3 className="text-neutral-500 mb-1">No Attorneys Added</h3>
                <p className="text-sm text-neutral-400 mb-4 max-w-xs">
                  There are no attorneys associated with this law firm yet. Click the button above to add a new attorney.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Associated deals card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Associated Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {deals && deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map((deal) => (
                  <Link key={deal.id} href={`/deal/${deal.id}`}>
                    <div className="flex flex-col p-3 rounded-md border border-neutral-200 hover:border-primary/70 hover:bg-neutral-50 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-primary">{formatDealTitle(deal)}</h3>
                        <Badge className={`ml-2 ${getStatusColor(deal.status)}`}>
                          {deal.status || 'Unknown Status'}
                        </Badge>
                      </div>
                      
                      <div className="mt-1 text-sm text-neutral-500">
                        <div className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          {deal.dueDate ? (
                            <span>Due: {format(new Date(deal.dueDate), 'MMM d, yyyy')}</span>
                          ) : (
                            <span>No due date</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-end">
                        <div className="flex items-center text-primary text-xs font-medium">
                          <span>View Deal</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <FileText className="h-12 w-12 text-neutral-200 mb-3" />
                <h3 className="text-neutral-500 mb-1">No Deals Associated</h3>
                <p className="text-sm text-neutral-400 mb-4 max-w-xs">
                  This law firm is not associated with any deals yet. Deals can be linked to this firm when creating or editing a deal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit attorney dialog */}
      <Dialog open={isEditAttorneyOpen} onOpenChange={setIsEditAttorneyOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Attorney</DialogTitle>
            <DialogDescription>
              Update information for {editingAttorney?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAttorney} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input 
                id="edit-name" 
                name="name" 
                value={editingAttorney?.name || ''} 
                onChange={handleEditInputChange} 
                placeholder="John Smith" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-position">Position</Label>
              <Input 
                id="edit-position" 
                name="position" 
                value={editingAttorney?.position || ''} 
                onChange={handleEditInputChange} 
                placeholder="Partner" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email" 
                name="email" 
                type="email" 
                value={editingAttorney?.email || ''} 
                onChange={handleEditInputChange} 
                placeholder="john.smith@example.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Work Phone</Label>
              <Input 
                id="edit-phone" 
                name="phone" 
                type="tel" 
                value={editingAttorney?.phone || ''} 
                onChange={handleEditInputChange} 
                placeholder="(555) 123-4567" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mobile">Mobile Phone</Label>
              <Input 
                id="edit-mobile" 
                name="mobile" 
                type="tel" 
                value={editingAttorney?.mobile || ''} 
                onChange={handleEditInputChange} 
                placeholder="(555) 123-4567" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-photo">Photo</Label>
              <PhotoUpload 
                onUpload={handleEditPhotoUpload}
                accept="image/*"
                maxSizeInMB={2}
              />
              {editingAttorney?.photoUrl && (
                <div className="mt-2 flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Avatar className="cursor-pointer hover:opacity-90 transition-opacity">
                        <AvatarImage src={editingAttorney.photoUrl} alt="Preview" />
                        <AvatarFallback>
                          {editingAttorney.initials || editingAttorney.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{editingAttorney.name}</DialogTitle>
                        <DialogDescription>{editingAttorney.position}</DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center justify-center py-4">
                        <img 
                          src={editingAttorney.photoUrl} 
                          alt={editingAttorney.name} 
                          className="max-h-[400px] max-w-full rounded-md object-cover" 
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <span className="text-sm text-green-600">Current photo (click to enlarge)</span>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditAttorneyOpen(false)}
                disabled={updateAttorneyMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateAttorneyMutation.isPending || !editingAttorney?.name || !editingAttorney?.email}
              >
                {updateAttorneyMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Add attorney dialog */}
      <Dialog open={isAddAttorneyOpen} onOpenChange={setIsAddAttorneyOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Attorney</DialogTitle>
            <DialogDescription>
              Add a new attorney to {lawFirm.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAttorney} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                name="name" 
                value={newAttorney.name} 
                onChange={handleInputChange} 
                placeholder="John Smith" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input 
                id="position" 
                name="position" 
                value={newAttorney.position} 
                onChange={handleInputChange} 
                placeholder="Partner" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={newAttorney.email} 
                onChange={handleInputChange} 
                placeholder="john.smith@example.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Work Phone</Label>
              <Input 
                id="phone" 
                name="phone" 
                type="tel" 
                value={newAttorney.phone} 
                onChange={handleInputChange} 
                placeholder="(555) 123-4567" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Phone</Label>
              <Input 
                id="mobile" 
                name="mobile" 
                type="tel" 
                value={newAttorney.mobile || ''} 
                onChange={handleInputChange} 
                placeholder="(555) 123-4567" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <PhotoUpload 
                onUpload={handlePhotoUpload}
                accept="image/*"
                maxSizeInMB={2}
              />
              {newAttorney.photoUrl && (
                <div className="mt-2 flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src={newAttorney.photoUrl} alt="Preview" />
                    <AvatarFallback>
                      {newAttorney.initials || (newAttorney.name ? newAttorney.name.charAt(0) : 'A')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-green-600">Photo uploaded</span>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddAttorneyOpen(false)}
                disabled={addAttorneyMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addAttorneyMutation.isPending || !newAttorney.name || !newAttorney.email}
              >
                {addAttorneyMutation.isPending ? 'Adding...' : 'Add Attorney'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}