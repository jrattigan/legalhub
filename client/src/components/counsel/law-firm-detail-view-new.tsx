import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertCircle, Building, Mail, Phone, User, Briefcase, FileText, Calendar, UserPlus, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}`;
  }
  
  // Return the original if not 10 digits
  return phone;
};

interface LawFirmDetailViewProps {
  lawFirmId: number | null; // Allow null for initial state
}

// Loading component to avoid conditional returns
const LoadingView = () => (
  <div className="p-6">
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  </div>
);

// Error component to avoid conditional returns
const ErrorView = () => (
  <div className="p-6">
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Failed to load law firm details. Please try again later.
      </AlertDescription>
    </Alert>
  </div>
);

// Empty state component to avoid conditional returns
const EmptyStateView = () => (
  <div className="p-6 flex flex-col items-center justify-center h-full text-center">
    <Building className="h-16 w-16 text-neutral-300 mb-4" />
    <h2 className="text-xl font-medium mb-2">No Law Firm Selected</h2>
    <p className="text-neutral-500 max-w-md">
      Please select a law firm from the list to view its details, associated attorneys, and deals.
    </p>
  </div>
);

export default function LawFirmDetailView({ lawFirmId }: LawFirmDetailViewProps) {
  // All hooks at the top level - no conditionals
  const [isAddAttorneyOpen, setIsAddAttorneyOpen] = useState(false);
  const [isEditAttorneyOpen, setIsEditAttorneyOpen] = useState(false);
  const [isEditLawFirmOpen, setIsEditLawFirmOpen] = useState(false);
  const [newAttorney, setNewAttorney] = useState<Partial<InsertAttorney>>({});
  const [editingAttorney, setEditingAttorney] = useState<Attorney | null>(null);
  const [editingLawFirm, setEditingLawFirm] = useState<LawFirm | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Query hooks
  const { 
    data: lawFirm, 
    isLoading: lawFirmLoading, 
    error: lawFirmError 
  } = useQuery<LawFirm>({
    queryKey: ['/api/law-firms', lawFirmId],
    queryFn: async () => {
      if (!lawFirmId) return null;
      const response = await fetch(`/api/law-firms/${lawFirmId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch law firm details');
      }
      return response.json();
    },
    enabled: !!lawFirmId,
    retry: 1,
  });

  const { 
    data: attorneys = [], 
    isLoading: attorneysLoading, 
    error: attorneysError 
  } = useQuery<Attorney[]>({
    queryKey: ['/api/attorneys'],
    queryFn: async () => {
      if (!lawFirmId) return [];
      const response = await fetch(`/api/law-firms/${lawFirmId}/attorneys`);
      if (!response.ok) {
        throw new Error('Failed to fetch attorneys');
      }
      return response.json();
    },
    enabled: !!lawFirmId,
    retry: 1,
  });
  
  const { 
    data: deals = [], 
    isLoading: dealsLoading, 
    error: dealsError 
  } = useQuery<Deal[]>({
    queryKey: ['/api/deals/law-firm', lawFirmId],
    queryFn: async () => {
      if (!lawFirmId) return [];
      const response = await fetch(`/api/law-firms/${lawFirmId}/deals`);
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      return response.json();
    },
    enabled: !!lawFirmId,
    retry: 1,
  });

  // Mutation hooks
  const addAttorneyMutation = useMutation({
    mutationFn: async (attorney: Partial<InsertAttorney>) => {
      if (!lawFirmId) throw new Error("Law firm ID is required");
      
      // Format phone numbers before saving to ensure consistency in the database
      let formattedPhone = attorney.phone;
      let formattedMobile = attorney.mobile;
      
      if (attorney.phone) {
        formattedPhone = formatPhoneNumber(attorney.phone);
      }
      
      if (attorney.mobile) {
        formattedMobile = formatPhoneNumber(attorney.mobile);
      }
      
      const payload = {
        ...attorney,
        phone: formattedPhone,
        mobile: formattedMobile,
        lawFirmId,
        // Generate random color for avatar if not provided
        avatarColor: attorney.avatarColor || `#${Math.floor(Math.random()*16777215).toString(16)}`,
        // Generate initials if not provided
        initials: attorney.initials || attorney.name?.split(' ').map(n => n[0]).join('') || 'XX'
      };
      
      const response = await fetch(`/api/attorneys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create attorney');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setNewAttorney({});
      setIsAddAttorneyOpen(false);
      
      // Invalidate attorneys query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/attorneys'] });
      
      toast({
        title: "Attorney added",
        description: "The attorney has been successfully added to this law firm.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add attorney",
        description: error.message || "An error occurred while adding the attorney. Please try again.",
      });
    }
  });
  
  const updateAttorneyMutation = useMutation({
    mutationFn: async (attorney: Attorney) => {
      // Format phone numbers before saving to ensure consistency in the database
      let formattedPhone = attorney.phone;
      let formattedMobile = attorney.mobile;
      
      if (attorney.phone) {
        formattedPhone = formatPhoneNumber(attorney.phone);
      }
      
      if (attorney.mobile) {
        formattedMobile = formatPhoneNumber(attorney.mobile);
      }
      
      const response = await fetch(`/api/attorneys/${attorney.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: attorney.name,
          position: attorney.position,
          email: attorney.email,
          phone: formattedPhone,
          mobile: formattedMobile,
          photoUrl: attorney.photoUrl
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update attorney');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      setEditingAttorney(null);
      setIsEditAttorneyOpen(false);
      
      // Invalidate attorneys query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/attorneys'] });
      
      toast({
        title: "Attorney updated",
        description: "The attorney information has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update attorney",
        description: error.message || "An error occurred while updating the attorney. Please try again.",
      });
    }
  });

  const updateLawFirmMutation = useMutation({
    mutationFn: async (lawFirm: LawFirm) => {
      const response = await fetch(`/api/law-firms/${lawFirm.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: lawFirm.name,
          specialty: lawFirm.specialty
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update law firm');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      setEditingLawFirm(null);
      setIsEditLawFirmOpen(false);
      
      // Invalidate law firms query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/law-firms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/law-firms', lawFirmId] });
      
      toast({
        title: "Law firm updated",
        description: "The law firm information has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update law firm",
        description: error.message || "An error occurred while updating the law firm. Please try again.",
      });
    }
  });

  // Event handlers
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingAttorney(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };
  
  const handleEditAttorney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttorney) return;
    
    if (!editingAttorney.name || !editingAttorney.email) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Attorney name and email are required.",
      });
      return;
    }
    
    updateAttorneyMutation.mutate(editingAttorney);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAttorney(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePhotoUpload = async (file: File) => {
    try {
      const base64 = await convertFileToBase64(file);
      setNewAttorney(prev => ({ ...prev, photoUrl: base64 }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to upload photo",
        description: "There was an error processing the image. Please try again.",
      });
    }
  };
  
  const handleEditPhotoUpload = async (file: File) => {
    try {
      const base64 = await convertFileToBase64(file);
      setEditingAttorney(prev => {
        if (!prev) return null;
        return { ...prev, photoUrl: base64 };
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to upload photo",
        description: "There was an error processing the image. Please try again.",
      });
    }
  };
  
  const handleAddAttorney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttorney.name || !newAttorney.email) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Attorney name and email are required.",
      });
      return;
    }
    
    addAttorneyMutation.mutate(newAttorney);
  };

  const handleLawFirmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingLawFirm(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };
  
  const handleEditLawFirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLawFirm) return;
    
    if (!editingLawFirm.name) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Law firm name is required.",
      });
      return;
    }
    
    updateLawFirmMutation.mutate(editingLawFirm);
  };

  // Helper functions
  const formatDealTitle = (deal: Deal) => {
    const companyName = deal.companyName || 'Unnamed Company';
    const title = deal.title || 'Untitled Deal';
    return `${companyName} - ${title}`;
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-neutral-100 text-neutral-800';
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  // Early return conditions - use pre-made components
  if (lawFirmLoading || attorneysLoading || dealsLoading) {
    return <LoadingView />;
  }

  if (lawFirmError || attorneysError || dealsError) {
    return <ErrorView />;
  }

  if (!lawFirm) {
    return <EmptyStateView />;
  }

  // Main render
  return (
    <div className="p-6">
      {/* Law firm header with edit button */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">{lawFirm.name}</h1>
          <p className="text-neutral-500 text-sm">
            <span className="inline-flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              {lawFirm.specialty}
            </span>
          </p>
        </div>
        <Dialog open={isEditLawFirmOpen} onOpenChange={setIsEditLawFirmOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setEditingLawFirm(lawFirm)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Law Firm</DialogTitle>
              <DialogDescription>
                Update information for {editingLawFirm?.name || 'the law firm'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditLawFirm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lawfirm-name">Name</Label>
                <Input 
                  id="edit-lawfirm-name" 
                  name="name" 
                  value={editingLawFirm?.name || ''} 
                  onChange={handleLawFirmInputChange} 
                  placeholder="Smith & Partners LLP" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lawfirm-specialty">Specialty</Label>
                <Input 
                  id="edit-lawfirm-specialty" 
                  name="specialty" 
                  value={editingLawFirm?.specialty || ''} 
                  onChange={handleLawFirmInputChange} 
                  placeholder="Corporate Securities" 
                />
              </div>
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditLawFirmOpen(false)}
                  disabled={updateLawFirmMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateLawFirmMutation.isPending || !editingLawFirm?.name}
                >
                  {updateLawFirmMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Associated attorneys card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Attorneys</CardTitle>
            </div>
            <Dialog open={isAddAttorneyOpen} onOpenChange={setIsAddAttorneyOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Attorney</DialogTitle>
                  <DialogDescription>
                    Add a new attorney to {lawFirm.name}. Fill in the information below.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAttorney} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={newAttorney.name || ''} 
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
                      value={newAttorney.position || ''} 
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
                      value={newAttorney.email || ''} 
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
                      value={newAttorney.phone || ''} 
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
                            {newAttorney.name ? newAttorney.name.charAt(0) : 'A'}
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
          </CardHeader>
          <CardContent>
            {attorneys?.length > 0 ? (
              <div className="space-y-3">
                {attorneys.map((attorney) => (
                  <div key={attorney.id} className="flex items-start p-3 rounded-md border border-neutral-200">
                    <Avatar className="h-10 w-10 mr-4">
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
              <div className="text-center py-12">
                <User className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No attorneys listed</h3>
                <p className="text-neutral-500 mb-4 max-w-md mx-auto">
                  There are no attorneys associated with this law firm yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Edit Attorney Dialog - Always defined, never conditionally rendered */}
      <Dialog open={isEditAttorneyOpen} onOpenChange={setIsEditAttorneyOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Attorney</DialogTitle>
            <DialogDescription>
              Update attorney information for {editingAttorney?.name || 'this attorney'}
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
              <Label htmlFor="edit-phone">Work</Label>
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
              <Label htmlFor="edit-mobile">Mobile</Label>
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
                  <Avatar>
                    <AvatarImage src={editingAttorney.photoUrl} alt="Preview" />
                    <AvatarFallback>
                      {editingAttorney.name ? editingAttorney.name.charAt(0) : 'A'}
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
      
      {/* Related deals card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {deals && deals.length > 0 ? (
            <div className="space-y-4">
              {deals.map((deal) => (
                <div key={deal.id} className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link href={`/deals/${deal.id}`}>
                        <h3 className="font-medium text-lg hover:text-primary transition-colors">{formatDealTitle(deal)}</h3>
                      </Link>
                      <div className="text-sm text-neutral-500">
                        {deal.description || 'No description provided'}
                      </div>
                    </div>
                    <Badge className={getStatusColor(deal.status)}>
                      {deal.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
                    {deal.dueDate && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-neutral-500 mr-2" />
                        <span>Closing Date: {format(new Date(deal.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">No deals found</h3>
              <p className="text-neutral-500 mb-4 max-w-md mx-auto">
                This law firm is not currently assigned to any deals.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}