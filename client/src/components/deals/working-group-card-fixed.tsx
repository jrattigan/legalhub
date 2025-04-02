import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building, Edit, Mail, Phone, Plus, Users, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

// Define types
interface Attorney {
  id: number;
  name: string;
  email: string;
  phone?: string;
  position: string;
  bio?: string;
  specialties?: string[];
  lawFirmId: number;
  initials: string;
  avatarColor: string;
  photoUrl?: string;
}

interface LawFirm {
  id: number;
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

interface UserType {
  id: number;
  fullName: string;
  email: string;
  role: string;
  avatarColor: string;
  initials: string;
}

// Entry for a counsel (law firm or law firm + attorney)
interface CounselEntry {
  lawFirmId: number;
  attorneyId: number | null;
}

interface WorkingGroupCardProps {
  counsel: {
    id: number;
    lawFirm: LawFirm;
    attorney?: Attorney;
    role: string;
  }[];
  dealId: number;
  companyId: number;
  companyName: string;
  bcvTeam?: string[];
  leadInvestor?: string;
  onRefreshData: () => void;
}

type EditSectionType = 'leadInvestor' | 'investmentTeam' | 'investorCounsel' | 'companyCounsel' | null;

export default function WorkingGroupCardFixed({ 
  counsel,
  dealId,
  companyId,
  companyName,
  bcvTeam = [],
  leadInvestor = '',
  onRefreshData
}: WorkingGroupCardProps) {
  // Split counsel by role
  const investorCounsel = counsel.filter(c => c.role === 'Lead Counsel');
  const companyCounsel = counsel.filter(c => c.role === 'Supporting');
  
  // State for edit dialog and form values
  const [editingSection, setEditingSection] = useState<EditSectionType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedLeadInvestor, setSelectedLeadInvestor] = useState<string>(leadInvestor || '');
  const [teamMembers, setTeamMembers] = useState<string[]>(bcvTeam || []);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<number[]>([]);
  
  // State for counsel selection
  const [selectedInvestorLawFirmId, setSelectedInvestorLawFirmId] = useState<number | null>(null);
  const [selectedInvestorAttorneyId, setSelectedInvestorAttorneyId] = useState<number | null>(null);
  const [selectedCompanyLawFirmId, setSelectedCompanyLawFirmId] = useState<number | null>(null);
  const [selectedCompanyAttorneyId, setSelectedCompanyAttorneyId] = useState<number | null>(null);
  
  // State for selected counsel entries
  const [investorCounselEntries, setInvestorCounselEntries] = useState<CounselEntry[]>([]);
  const [companyCounselEntries, setCompanyCounselEntries] = useState<CounselEntry[]>([]);
  
  // Track attorneys by law firm for display and selection
  const [investorAttorneysByFirm, setInvestorAttorneysByFirm] = useState<Record<number, Attorney[]>>({});
  const [companyAttorneysByFirm, setCompanyAttorneysByFirm] = useState<Record<number, Attorney[]>>({});
  
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  // Fetch data
  const { data: leadInvestors = [] } = useQuery<string[]>({
    queryKey: ['/api/lead-investors'],
  });
  
  const { data: lawFirms = [] } = useQuery<LawFirm[]>({
    queryKey: ['/api/law-firms'],
  });
  
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });
  
  // When selecting a law firm, fetch its attorneys
  useEffect(() => {
    if (selectedInvestorLawFirmId) {
      fetchAttorneys(selectedInvestorLawFirmId, true);
    }
  }, [selectedInvestorLawFirmId]);
  
  useEffect(() => {
    if (selectedCompanyLawFirmId) {
      fetchAttorneys(selectedCompanyLawFirmId, false);
    }
  }, [selectedCompanyLawFirmId]);
  
  // Fetch attorneys for a law firm
  const fetchAttorneys = async (lawFirmId: number, isInvestor: boolean) => {
    try {
      // Set loading state if you want
      const response = await fetch(`/api/law-firms/${lawFirmId}/attorneys`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch attorneys: ${response.status} ${response.statusText}`);
      }
      
      const attorneys: Attorney[] = await response.json();
      console.log(`Loaded ${attorneys.length} attorneys for law firm ${lawFirmId}:`, attorneys);
      
      // Update the appropriate firm's attorneys
      if (isInvestor) {
        setInvestorAttorneysByFirm(prev => ({
          ...prev,
          [lawFirmId]: attorneys
        }));
      } else {
        setCompanyAttorneysByFirm(prev => ({
          ...prev,
          [lawFirmId]: attorneys
        }));
      }
    } catch (error) {
      console.error("Error fetching attorneys:", error);
    }
  };
  
  // Initialize dialog form data when opened
  const handleEdit = (section: EditSectionType) => {
    // Reset form data based on current values
    if (section === 'leadInvestor') {
      setSelectedLeadInvestor(leadInvestor || '');
    } else if (section === 'investmentTeam') {
      // First get the full list of team members
      setTeamMembers([...bcvTeam]);
      
      // Separate into system users and custom (external) team members
      const systemUserIds: number[] = [];
      const customMembers: string[] = [];
      
      // Process each BCV team member
      bcvTeam.forEach(name => {
        const user = users.find(user => user.fullName === name);
        if (user) {
          // This is a system user, add to IDs list
          systemUserIds.push(user.id);
        } else {
          // This is a custom external member, add to custom list
          customMembers.push(name);
        }
      });
      
      console.log('System user IDs:', systemUserIds);
      console.log('Custom members:', customMembers);
      
      // Set state for both types of team members
      setSelectedTeamMembers(systemUserIds);
      
      // teamMembers already has all members (both system and custom)
    } else if (section === 'investorCounsel') {
      // Reset the form state
      setSelectedInvestorLawFirmId(null);
      setSelectedInvestorAttorneyId(null);
      
      // Pre-fetch attorneys for all existing law firms
      const uniqueFirmIds = new Set<number>();
      investorCounsel.forEach(counsel => {
        uniqueFirmIds.add(counsel.lawFirm.id);
      });
      
      uniqueFirmIds.forEach(firmId => {
        fetchAttorneys(firmId, true);
      });
      
      // Prepare entries to be displayed and edited (using the exact same format we'll send to the server)
      const entries: CounselEntry[] = [];
      investorCounsel.forEach(counsel => {
        entries.push({
          lawFirmId: counsel.lawFirm.id,
          attorneyId: counsel.attorney?.id || null
        });
      });
      
      setInvestorCounselEntries(entries);
    } else if (section === 'companyCounsel') {
      // Reset the form state
      setSelectedCompanyLawFirmId(null);
      setSelectedCompanyAttorneyId(null);
      
      // Pre-fetch attorneys for all existing law firms
      const uniqueFirmIds = new Set<number>();
      companyCounsel.forEach(counsel => {
        uniqueFirmIds.add(counsel.lawFirm.id);
      });
      
      uniqueFirmIds.forEach(firmId => {
        fetchAttorneys(firmId, false);
      });
      
      // Prepare entries to be displayed and edited
      const entries: CounselEntry[] = [];
      companyCounsel.forEach(counsel => {
        entries.push({
          lawFirmId: counsel.lawFirm.id,
          attorneyId: counsel.attorney?.id || null
        });
      });
      
      setCompanyCounselEntries(entries);
    }
    
    setEditingSection(section);
    setIsDialogOpen(true);
  };
  
  // Close the dialog
  const handleCloseDialog = () => {
    setEditingSection(null);
    setIsDialogOpen(false);
  };
  
  // Function to update deal with lead investor
  const updateDeal = async (data: any) => {
    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update deal');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  };
  
  // Function to update company
  const updateCompany = async (data: any) => {
    try {
      if (!companyId) {
        throw new Error('Company ID is not available');
      }
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update company');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  };
  
  // Function to replace all counsel entries of a specific role
  const replaceCounsel = async (role: string, entries: CounselEntry[]) => {
    try {
      // Create payload with entries and role
      const payload = {
        dealId,
        role,
        entries: entries.length > 0 ? entries : [] // Ensure we send an empty array if no entries
      };
      
      console.log(`Replacing ${role} counsel with:`, payload);
      console.log(`Raw entries:`, entries);
      
      // Debug log to verify the entries have the correct format
      if (entries.length > 0) {
        entries.forEach((entry, index) => {
          console.log(`Entry ${index}:`, entry);
          console.log(`  lawFirmId: ${entry.lawFirmId} (${typeof entry.lawFirmId})`);
          console.log(`  attorneyId: ${entry.attorneyId} (${typeof entry.attorneyId})`);
          
          // Check if lawFirmId exists in the lawFirms array
          const lawFirm = lawFirms.find(firm => firm.id === entry.lawFirmId);
          console.log(`  Law firm found: ${lawFirm ? 'Yes' : 'No'}, name: ${lawFirm ? lawFirm.name : 'Unknown'}`);
        });
      }
      
      const response = await fetch(`/api/deal-counsels/replace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Log raw response for debugging
      console.log(`Response status:`, response.status);
      console.log(`Response status text:`, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response error:', errorText);
        throw new Error(`Failed to replace counsel: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`Success replacing ${role} counsel, server response:`, result);
      
      return result;
    } catch (error) {
      console.error(`Error replacing ${role} counsel:`, error);
      throw error;
    }
  };
  
  // Function to add a counsel entry
  const addCounselEntry = (isInvestor: boolean) => {
    if (isInvestor && selectedInvestorLawFirmId) {
      // Check if this exact combo already exists
      const alreadyExists = investorCounselEntries.some(entry => 
        entry.lawFirmId === selectedInvestorLawFirmId && 
        entry.attorneyId === selectedInvestorAttorneyId
      );
      
      if (!alreadyExists) {
        setInvestorCounselEntries([
          ...investorCounselEntries,
          {
            lawFirmId: selectedInvestorLawFirmId,
            attorneyId: selectedInvestorAttorneyId
          }
        ]);
      }
      
      // Reset attorney but keep law firm for convenience
      setSelectedInvestorAttorneyId(null);
    } 
    else if (!isInvestor && selectedCompanyLawFirmId) {
      // Check if this exact combo already exists
      const alreadyExists = companyCounselEntries.some(entry => 
        entry.lawFirmId === selectedCompanyLawFirmId && 
        entry.attorneyId === selectedCompanyAttorneyId
      );
      
      if (!alreadyExists) {
        setCompanyCounselEntries([
          ...companyCounselEntries,
          {
            lawFirmId: selectedCompanyLawFirmId,
            attorneyId: selectedCompanyAttorneyId
          }
        ]);
      }
      
      // Reset attorney but keep law firm
      setSelectedCompanyAttorneyId(null);
    }
  };
  
  // Remove counsel entry at specific index
  const removeCounselEntry = (isInvestor: boolean, index: number) => {
    if (isInvestor) {
      const entry = investorCounselEntries[index];
      // If this is an attorney (not just a law firm entry), only remove this specific attorney
      if (entry.attorneyId !== null) {
        const updated = [...investorCounselEntries];
        updated.splice(index, 1);
        
        // Check if there are other entries with this law firm
        const hasOtherAttorneysFromSameFirm = updated.some(e => 
          e.lawFirmId === entry.lawFirmId && e.attorneyId !== null
        );
        
        // If no other attorneys from this firm and no law firm-only entry exists
        const hasLawFirmEntry = updated.some(e => 
          e.lawFirmId === entry.lawFirmId && e.attorneyId === null
        );
        
        // If no other attorneys from this law firm and no law firm entry exists,
        // add a law firm entry without attorney
        if (!hasOtherAttorneysFromSameFirm && !hasLawFirmEntry) {
          updated.push({
            lawFirmId: entry.lawFirmId,
            attorneyId: null
          });
        }
        
        setInvestorCounselEntries(updated);
      } else {
        // If it's a law firm entry (no attorney), remove the law firm and all its attorneys
        const updated = investorCounselEntries.filter(e => e.lawFirmId !== entry.lawFirmId);
        setInvestorCounselEntries(updated);
      }
    } else {
      const entry = companyCounselEntries[index];
      // If this is an attorney (not just a law firm entry), only remove this specific attorney
      if (entry.attorneyId !== null) {
        const updated = [...companyCounselEntries];
        updated.splice(index, 1);
        
        // Check if there are other entries with this law firm
        const hasOtherAttorneysFromSameFirm = updated.some(e => 
          e.lawFirmId === entry.lawFirmId && e.attorneyId !== null
        );
        
        // Check if law firm entry exists
        const hasLawFirmEntry = updated.some(e => 
          e.lawFirmId === entry.lawFirmId && e.attorneyId === null
        );
        
        // If no other attorneys from this law firm and no law firm entry exists,
        // add a law firm entry without attorney
        if (!hasOtherAttorneysFromSameFirm && !hasLawFirmEntry) {
          updated.push({
            lawFirmId: entry.lawFirmId,
            attorneyId: null
          });
        }
        
        setCompanyCounselEntries(updated);
      } else {
        // If it's a law firm entry (no attorney), remove the law firm and all its attorneys
        const updated = companyCounselEntries.filter(e => e.lawFirmId !== entry.lawFirmId);
        setCompanyCounselEntries(updated);
      }
    }
  };
  
  // Remove all entries for a specific law firm
  const removeLawFirmEntries = (isInvestor: boolean, lawFirmId: number) => {
    if (isInvestor) {
      setInvestorCounselEntries(
        investorCounselEntries.filter(entry => entry.lawFirmId !== lawFirmId)
      );
    } else {
      setCompanyCounselEntries(
        companyCounselEntries.filter(entry => entry.lawFirmId !== lawFirmId)
      );
    }
  };
  


  
  // Handle save changes based on the section being edited
  const handleSaveChanges = async () => {
    try {
      console.log('Saving changes for section:', editingSection);
      
      if (editingSection === 'leadInvestor') {
        console.log('Updating lead investor to:', selectedLeadInvestor);
        const result = await updateDeal({ leadInvestor: selectedLeadInvestor });
        console.log('Lead investor update result:', result);
      } 
      else if (editingSection === 'investmentTeam') {
        // For Investment Team, we need to combine both selected team member IDs
        // and any custom team members added directly

        console.log('Current bcvTeam (from props):', bcvTeam);
        console.log('Current teamMembers (state):', teamMembers);
        console.log('Current selectedTeamMembers (IDs):', selectedTeamMembers);

        // Get names from selected user IDs
        const selectedTeamNames = selectedTeamMembers
          .map(userId => {
            const user = users.find(u => u.id === userId);
            return user ? user.fullName : '';
          })
          .filter(name => name !== '');
        
        console.log('Team members from directory (by ID):', selectedTeamNames);
        
        // Get custom team members (those that don't exist in the users list)
        const customTeamMembers = teamMembers.filter(name => 
          !users.some(u => u.fullName === name)
        );
        
        console.log('Custom team members (not in directory):', customTeamMembers);
        
        // Combine both lists
        const combinedTeamNames = [...selectedTeamNames, ...customTeamMembers];
        
        console.log('Final combined team names to save:', combinedTeamNames);
        
        try {
          // Update the company with the combined team members
          const result = await updateCompany({ bcvTeam: combinedTeamNames });
          console.log('Investment team update API result:', result);
          
          // Log the current state to verify update was successful
          const companyData = await fetch(`/api/companies/${companyId}`).then(r => r.json());
          console.log('Freshly fetched company data after update:', companyData);
          
          // Update local state to immediately reflect changes
          setTeamMembers(combinedTeamNames);
          
          // Force state refresh
          onRefreshData();
        } catch (error) {
          console.error('Error updating investment team:', error);
        }
      } 
      else if (editingSection === 'investorCounsel') {
        // Add the current selection if not already in the list
        if (selectedInvestorLawFirmId && !investorCounselEntries.some(item => 
            item.lawFirmId === selectedInvestorLawFirmId && 
            item.attorneyId === selectedInvestorAttorneyId)) {
          addCounselEntry(true);
        }
        
        // Make a copy of the entries to ensure we're using the latest state
        const currentInvestorCounselEntries = [...investorCounselEntries];
        
        console.log('Updating investor counsel with entries:', currentInvestorCounselEntries);
        
        // Validate entry data before sending
        const validEntries = currentInvestorCounselEntries.map(entry => {
          // Ensure lawFirmId is a number
          const lawFirmId = typeof entry.lawFirmId === 'number' ? 
            entry.lawFirmId : parseInt(String(entry.lawFirmId));
          
          // Ensure attorneyId is either null or a number
          let attorneyId = entry.attorneyId;
          if (attorneyId !== null && typeof attorneyId !== 'number') {
            attorneyId = parseInt(String(attorneyId));
          }
          
          return {
            lawFirmId,
            attorneyId
          };
        }).filter(entry => !isNaN(entry.lawFirmId));
        
        console.log('Validated investor counsel entries:', validEntries);
        
        // Now send the validated entries
        const result = await replaceCounsel('Lead Counsel', validEntries);
        console.log('Investor counsel update result:', result);
        
        // Update local state with validated entries
        setInvestorCounselEntries(validEntries);
      } 
      else if (editingSection === 'companyCounsel') {
        // Add the current selection if not already in the list
        if (selectedCompanyLawFirmId && !companyCounselEntries.some(item => 
            item.lawFirmId === selectedCompanyLawFirmId && 
            item.attorneyId === selectedCompanyAttorneyId)) {
          addCounselEntry(false);
        }
        
        // Make a copy of the entries to ensure we're using the latest state
        const currentCompanyCounselEntries = [...companyCounselEntries];
        
        console.log('Updating company counsel with entries:', currentCompanyCounselEntries);
        
        // Validate entry data before sending
        const validEntries = currentCompanyCounselEntries.map(entry => {
          // Ensure lawFirmId is a number
          const lawFirmId = typeof entry.lawFirmId === 'number' ? 
            entry.lawFirmId : parseInt(String(entry.lawFirmId));
          
          // Ensure attorneyId is either null or a number
          let attorneyId = entry.attorneyId;
          if (attorneyId !== null && typeof attorneyId !== 'number') {
            attorneyId = parseInt(String(attorneyId));
          }
          
          return {
            lawFirmId,
            attorneyId
          };
        }).filter(entry => !isNaN(entry.lawFirmId));
        
        console.log('Validated company counsel entries:', validEntries);
        
        // Now send the validated entries
        const result = await replaceCounsel('Supporting', validEntries);
        console.log('Company counsel update result:', result);
        
        // Update local state with validated entries
        setCompanyCounselEntries(validEntries);
      }
      
      // Close dialog and refresh data
      handleCloseDialog();
      onRefreshData();
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };
  
  // Handle selecting team member by ID
  const handleSelectTeamMember = (userId: string) => {
    const id = parseInt(userId);
    // Toggle selection
    if (selectedTeamMembers.includes(id)) {
      setSelectedTeamMembers(selectedTeamMembers.filter(memberId => memberId !== id));
    } else {
      setSelectedTeamMembers([...selectedTeamMembers, id]);
    }
  };
  
  // Handle remove team member
  const handleRemoveTeamMember = (index: number) => {
    const updatedMembers = [...teamMembers];
    updatedMembers.splice(index, 1);
    setTeamMembers(updatedMembers);
  };
  
  // Dialog title mapping
  const dialogTitles = {
    leadInvestor: "Edit Lead Investor",
    investmentTeam: "Edit Investment Team",
    investorCounsel: "Edit Investor Counsel",
    companyCounsel: "Edit Company Counsel"
  };
  
  // Helper function to get law firm name
  const getLawFirmName = (lawFirmId: number) => {
    const firm = lawFirms.find(firm => firm.id === lawFirmId);
    return firm ? firm.name : 'Unknown Firm';
  };
  
  // Helper function to get attorney for a law firm
  const getAttorneyName = (lawFirmId: number, attorneyId: number | null) => {
    if (!attorneyId) return null;
    
    // Check if we have attorneys loaded for this firm
    const firmAttorneys = investorAttorneysByFirm[lawFirmId] || companyAttorneysByFirm[lawFirmId];
    if (!firmAttorneys) return 'Loading...';
    
    const attorney = firmAttorneys.find(atty => atty.id === attorneyId);
    return attorney ? attorney.name : 'Unknown Attorney';
  };
  
  const getAttorney = (lawFirmId: number, attorneyId: number | null, isInvestor: boolean) => {
    if (!attorneyId) return null;
    
    // Get attorneys for the specified law firm
    const attorneys = isInvestor ? 
      investorAttorneysByFirm[lawFirmId] : 
      companyAttorneysByFirm[lawFirmId];
    
    if (!attorneys) return null;
    
    return attorneys.find(atty => atty.id === attorneyId);
  };
  
  // Group law firms for display
  const groupCounselByLawFirm = (entries: CounselEntry[], isInvestor: boolean) => {
    const groups: Record<number, { lawFirmId: number, attorneys: number[] }> = {};
    
    entries.forEach(entry => {
      if (!groups[entry.lawFirmId]) {
        groups[entry.lawFirmId] = {
          lawFirmId: entry.lawFirmId,
          attorneys: []
        };
      }
      
      if (entry.attorneyId) {
        groups[entry.lawFirmId].attorneys.push(entry.attorneyId);
      }
    });
    
    return groups;
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 col-span-2">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium text-neutral-800">Working Group</h2>
        </div>
        
        <div className="space-y-4">
          {/* Lead Investor Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-neutral-700 flex items-center">
                <Building className="h-4 w-4 mr-1.5 text-neutral-500" />
                Lead Investor
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => handleEdit('leadInvestor')}
              >
                {leadInvestor ? <Edit className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {leadInvestor ? "Edit" : "Add"}
              </Button>
            </div>
            <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
              {leadInvestor ? (
                <div className="text-sm">{leadInvestor}</div>
              ) : (
                <div className="text-sm text-neutral-500 italic">No lead investor assigned</div>
              )}
            </div>
          </div>
          
          {/* Investment Team Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-neutral-700 flex items-center">
                <Users className="h-4 w-4 mr-1.5 text-neutral-500" />
                Investment Team
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => handleEdit('investmentTeam')}
              >
                {bcvTeam && bcvTeam.length > 0 ? <Edit className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {bcvTeam && bcvTeam.length > 0 ? "Edit" : "Add"}
              </Button>
            </div>
            <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
              {bcvTeam && bcvTeam.length > 0 ? (
                <div className="space-y-2">
                  {bcvTeam.map((member, index) => {
                    const user = users.find(u => u.fullName === member);
                    return (
                      <div key={`team-${index}`} className="flex items-center">
                        {user && (
                          <Avatar className="h-6 w-6 mr-2" style={{ backgroundColor: user.avatarColor }}>
                            <AvatarFallback>{user.initials}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="text-sm">{member}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-neutral-500 italic">No investment team members assigned</div>
              )}
            </div>
          </div>
          
          {/* Investor Counsel Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-neutral-700 flex items-center">
                <Building className="h-4 w-4 mr-1.5 text-neutral-500" />
                Investor Counsel
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => handleEdit('investorCounsel')}
              >
                {investorCounsel.length > 0 ? <Edit className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {investorCounsel.length > 0 ? "Edit" : "Add"}
              </Button>
            </div>
            
            {investorCounsel.length > 0 ? (
              <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
                {/* Group items by law firm */}
                {(() => {
                  // Group counsel by law firm ID
                  const lawFirmGroups = investorCounsel.reduce((groups, item) => {
                    const firmId = item.lawFirm.id;
                    if (!groups[firmId]) {
                      groups[firmId] = {
                        lawFirm: item.lawFirm,
                        attorneys: []
                      };
                    }
                    if (item.attorney) {
                      groups[firmId].attorneys.push(item.attorney);
                    }
                    return groups;
                  }, {} as Record<number, { lawFirm: LawFirm, attorneys: Attorney[] }>);
                  
                  // Render each law firm group
                  return Object.values(lawFirmGroups).map((group, index) => (
                    <div key={`firm-${group.lawFirm.id}-${index}`}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="font-medium">{group.lawFirm.name}</div>
                      
                      {group.attorneys.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {group.attorneys.map((attorney, idx) => (
                            <div key={`attorney-${attorney.id}-${idx}`} className="mt-3 flex items-center">
                              <Avatar className="h-6 w-6" style={{ backgroundColor: attorney.avatarColor }}>
                                <AvatarFallback>{attorney.initials}</AvatarFallback>
                              </Avatar>
                              <div className="ml-2">
                                <div className="text-sm font-medium">{attorney.name}</div>
                                <div className="text-xs text-neutral-500">{attorney.position}</div>
                              </div>
                              <div className="ml-auto flex space-x-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Mail className="h-3.5 w-3.5 text-neutral-400 hover:text-neutral-700" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Phone className="h-3.5 w-3.5 text-neutral-400 hover:text-neutral-700" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-neutral-500 italic">No attorneys specified</div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
                <div className="text-xs text-neutral-500 italic">No investor counsel assigned</div>
              </div>
            )}
          </div>
          
          {/* Company Counsel Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-neutral-700 flex items-center">
                <Building className="h-4 w-4 mr-1.5 text-neutral-500" />
                Company Counsel
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => handleEdit('companyCounsel')}
              >
                {companyCounsel.length > 0 ? <Edit className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {companyCounsel.length > 0 ? "Edit" : "Add"}
              </Button>
            </div>
            
            {companyCounsel.length > 0 ? (
              <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
                {/* Group items by law firm */}
                {(() => {
                  // Group counsel by law firm ID
                  const lawFirmGroups = companyCounsel.reduce((groups, item) => {
                    const firmId = item.lawFirm.id;
                    if (!groups[firmId]) {
                      groups[firmId] = {
                        lawFirm: item.lawFirm,
                        attorneys: []
                      };
                    }
                    if (item.attorney) {
                      groups[firmId].attorneys.push(item.attorney);
                    }
                    return groups;
                  }, {} as Record<number, { lawFirm: LawFirm, attorneys: Attorney[] }>);
                  
                  // Render each law firm group
                  return Object.values(lawFirmGroups).map((group, index) => (
                    <div key={`firm-${group.lawFirm.id}-${index}`}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="font-medium">{group.lawFirm.name}</div>
                      
                      {group.attorneys.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {group.attorneys.map((attorney, idx) => (
                            <div key={`attorney-${attorney.id}-${idx}`} className="mt-3 flex items-center">
                              <Avatar className="h-6 w-6" style={{ backgroundColor: attorney.avatarColor }}>
                                <AvatarFallback>{attorney.initials}</AvatarFallback>
                              </Avatar>
                              <div className="ml-2">
                                <div className="text-sm font-medium">{attorney.name}</div>
                                <div className="text-xs text-neutral-500">{attorney.position}</div>
                              </div>
                              <div className="ml-auto flex space-x-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Mail className="h-3.5 w-3.5 text-neutral-400 hover:text-neutral-700" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Phone className="h-3.5 w-3.5 text-neutral-400 hover:text-neutral-700" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-neutral-500 italic">No attorneys specified</div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
                <div className="text-xs text-neutral-500 italic">No company counsel assigned</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Dialog */}
      {isDialogOpen && editingSection && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{dialogTitles[editingSection]}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              {/* Lead Investor Form */}
              {editingSection === 'leadInvestor' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="leadInvestor">Lead Investor</Label>
                    <Select
                      value={selectedLeadInvestor}
                      onValueChange={setSelectedLeadInvestor}
                    >
                      <SelectTrigger id="leadInvestor">
                        <SelectValue placeholder="Select lead investor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {leadInvestors.map((investor, index) => (
                          <SelectItem key={index} value={investor}>
                            {investor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {/* Investment Team Form */}
              {editingSection === 'investmentTeam' && (
                <div className="space-y-4">
                  <div>
                    <Label>Selected Team Members from Directory</Label>
                    <div className="border rounded-md p-2 mt-1">
                      {selectedTeamMembers.length > 0 ? (
                        <div className="space-y-1">
                          {selectedTeamMembers.map(userId => {
                            const user = users.find(u => u.id === userId);
                            if (!user) return null;
                            
                            return (
                              <div key={userId} className="flex justify-between items-center py-1 px-2 rounded-sm bg-neutral-100">
                                <div className="flex items-center">
                                  <Avatar className="h-6 w-6" style={{ backgroundColor: user.avatarColor }}>
                                    <AvatarFallback>{user.initials}</AvatarFallback>
                                  </Avatar>
                                  <div className="ml-2 text-sm">{user.fullName}</div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => handleSelectTeamMember(userId.toString())}
                                >
                                  <X className="h-3.5 w-3.5 text-neutral-500" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500 italic p-2">No team members selected from directory</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="teamMember">Add Team Member from Directory</Label>
                    <Select
                      value={selectedUser}
                      onValueChange={(value) => {
                        handleSelectTeamMember(value);
                        setSelectedUser(''); // Reset the dropdown
                      }}
                    >
                      <SelectTrigger id="teamMember">
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName} - {user.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Custom team member section */}
                  <div className="space-y-2">
                    <Label htmlFor="customTeamMember">Add Custom Team Member</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        id="customTeamMember"
                        placeholder="Enter name (external team member)"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            setTeamMembers([...teamMembers, e.currentTarget.value.trim()]);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById('customTeamMember') as HTMLInputElement;
                          if (input && input.value.trim()) {
                            setTeamMembers([...teamMembers, input.value.trim()]);
                            input.value = '';
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-neutral-500">For team members not in the directory</p>
                  </div>
                  
                  {/* Display custom team members */}
                  {teamMembers.filter(name => !users.some(u => u.fullName === name)).length > 0 && (
                    <div>
                      <Label>Custom Team Members</Label>
                      <div className="border rounded-md p-2 mt-1">
                        <div className="space-y-1">
                          {teamMembers
                            .filter(name => !users.some(u => u.fullName === name))
                            .map((name, index) => (
                              <div key={`custom-${index}`} className="flex justify-between items-center py-1 px-2 rounded-sm bg-neutral-100">
                                <div className="text-sm">{name}</div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => handleRemoveTeamMember(teamMembers.indexOf(name))}
                                >
                                  <X className="h-3.5 w-3.5 text-neutral-500" />
                                </Button>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Investor Counsel Form */}
              {editingSection === 'investorCounsel' && (
                <div className="space-y-4">
                  {/* Display selected counsels */}
                  <div>
                    <Label>Selected Investor Counsel</Label>
                    <div className="border rounded-md p-2 mt-1 space-y-2 max-h-[180px] overflow-y-auto">
                      {investorCounselEntries.length > 0 ? (
                        <>
                          {/* Group by law firm */}
                          {Object.entries(groupCounselByLawFirm(investorCounselEntries, true)).map(([firmId, group], idx) => {
                            const lawFirm = lawFirms.find(f => f.id === parseInt(firmId));
                            if (!lawFirm) return null;
                            
                            return (
                              <div key={`firm-${firmId}-${idx}`} className="p-2 border rounded-md bg-neutral-50 mb-2">
                                <div className="flex justify-between items-center">
                                  <div className="font-medium">{lawFirm.name}</div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => removeLawFirmEntries(true, parseInt(firmId))}
                                  >
                                    <X className="h-4 w-4 text-neutral-500" />
                                  </Button>
                                </div>
                                
                                {/* Show attorneys for this firm */}
                                {group.attorneys.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {group.attorneys.map((attorneyId, attyIdx) => {
                                      // Find the attorney object
                                      const attorney = getAttorney(parseInt(firmId), attorneyId, true);
                                      
                                      // Find the index in our entries list for removal
                                      const entryIndex = investorCounselEntries.findIndex(
                                        e => e.lawFirmId === parseInt(firmId) && e.attorneyId === attorneyId
                                      );
                                      
                                      if (!attorney) return null;
                                      
                                      return (
                                        <div key={`atty-${attorneyId}-${attyIdx}`} className="flex items-center justify-between mt-1 ml-2">
                                          <div className="flex items-center">
                                            <Avatar className="h-5 w-5 mr-1" style={{ backgroundColor: attorney.avatarColor }}>
                                              <AvatarFallback>{attorney.initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="text-xs">{attorney.name}</div>
                                          </div>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5"
                                            onClick={() => {
                                              if (entryIndex >= 0) {
                                                removeCounselEntry(true, entryIndex);
                                              }
                                            }}
                                          >
                                            <X className="h-3 w-3 text-neutral-500" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <div className="text-xs text-neutral-500 italic p-2">No investor counsel selected. Add at least one law firm below.</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Add new counsel section */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-medium">Add New Counsel</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="investorLawFirm">Law Firm</Label>
                      <Select 
                        value={selectedInvestorLawFirmId?.toString() || ''} 
                        onValueChange={(value) => setSelectedInvestorLawFirmId(parseInt(value))}
                      >
                        <SelectTrigger id="investorLawFirm">
                          <SelectValue placeholder="Select law firm" />
                        </SelectTrigger>
                        <SelectContent>
                          {lawFirms.map((firm) => (
                            <SelectItem key={firm.id} value={firm.id.toString()}>
                              {firm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedInvestorLawFirmId && (
                      <div className="space-y-2">
                        <Label htmlFor="investorAttorney">Attorney</Label>
                        <Select 
                          value={selectedInvestorAttorneyId?.toString() || ''} 
                          onValueChange={(value) => {
                            if (value === "0") {
                              setSelectedInvestorAttorneyId(null);
                            } else {
                              setSelectedInvestorAttorneyId(parseInt(value));
                            }
                          }}
                        >
                          <SelectTrigger id="investorAttorney">
                            <SelectValue placeholder="Select attorney (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {investorAttorneysByFirm[selectedInvestorLawFirmId]?.map((attorney) => (
                              <SelectItem key={attorney.id} value={attorney.id.toString()}>
                                {attorney.name} - {attorney.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {selectedInvestorLawFirmId && (
                      <Button
                        onClick={() => addCounselEntry(true)}
                        type="button"
                        className="mt-2"
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {selectedInvestorAttorneyId ? 'Add Attorney' : 'Add Law Firm Without Attorney'}
                      </Button> 
                    )}
                  </div>
                </div>
              )}
              
              {/* Company Counsel Form */}
              {editingSection === 'companyCounsel' && (
                <div className="space-y-4">
                  {/* Display selected counsels */}
                  <div>
                    <Label>Selected Company Counsel</Label>
                    <div className="border rounded-md p-2 mt-1 space-y-2 max-h-[180px] overflow-y-auto">
                      {companyCounselEntries.length > 0 ? (
                        <>
                          {/* Group by law firm */}
                          {Object.entries(groupCounselByLawFirm(companyCounselEntries, false)).map(([firmId, group], idx) => {
                            const lawFirm = lawFirms.find(f => f.id === parseInt(firmId));
                            if (!lawFirm) return null;
                            
                            return (
                              <div key={`firm-${firmId}-${idx}`} className="p-2 border rounded-md bg-neutral-50 mb-2">
                                <div className="flex justify-between items-center">
                                  <div className="font-medium">{lawFirm.name}</div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => removeLawFirmEntries(false, parseInt(firmId))}
                                  >
                                    <X className="h-4 w-4 text-neutral-500" />
                                  </Button>
                                </div>
                                
                                {/* Show attorneys for this firm */}
                                {group.attorneys.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {group.attorneys.map((attorneyId, attyIdx) => {
                                      // Find the attorney object
                                      const attorney = getAttorney(parseInt(firmId), attorneyId, false);
                                      
                                      // Find the index in our entries list for removal
                                      const entryIndex = companyCounselEntries.findIndex(
                                        e => e.lawFirmId === parseInt(firmId) && e.attorneyId === attorneyId
                                      );
                                      
                                      if (!attorney) return null;
                                      
                                      return (
                                        <div key={`atty-${attorneyId}-${attyIdx}`} className="flex items-center justify-between mt-1 ml-2">
                                          <div className="flex items-center">
                                            <Avatar className="h-5 w-5 mr-1" style={{ backgroundColor: attorney.avatarColor }}>
                                              <AvatarFallback>{attorney.initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="text-xs">{attorney.name}</div>
                                          </div>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5"
                                            onClick={() => {
                                              if (entryIndex >= 0) {
                                                removeCounselEntry(false, entryIndex);
                                              }
                                            }}
                                          >
                                            <X className="h-3 w-3 text-neutral-500" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <div className="text-xs text-neutral-500 italic p-2">No company counsel selected. Add at least one law firm below.</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Add new counsel section */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-medium">Add New Counsel</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyLawFirm">Law Firm</Label>
                      <Select 
                        value={selectedCompanyLawFirmId?.toString() || ''} 
                        onValueChange={(value) => setSelectedCompanyLawFirmId(parseInt(value))}
                      >
                        <SelectTrigger id="companyLawFirm">
                          <SelectValue placeholder="Select law firm" />
                        </SelectTrigger>
                        <SelectContent>
                          {lawFirms.map((firm) => (
                            <SelectItem key={firm.id} value={firm.id.toString()}>
                              {firm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedCompanyLawFirmId && (
                      <div className="space-y-2">
                        <Label htmlFor="companyAttorney">Attorney</Label>
                        <Select 
                          value={selectedCompanyAttorneyId?.toString() || ''} 
                          onValueChange={(value) => {
                            if (value === "0") {
                              setSelectedCompanyAttorneyId(null);
                            } else {
                              setSelectedCompanyAttorneyId(parseInt(value));
                            }
                          }}
                        >
                          <SelectTrigger id="companyAttorney">
                            <SelectValue placeholder="Select attorney (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {companyAttorneysByFirm[selectedCompanyLawFirmId]?.map((attorney) => (
                              <SelectItem key={attorney.id} value={attorney.id.toString()}>
                                {attorney.name} - {attorney.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {selectedCompanyLawFirmId && (
                      <Button
                        onClick={() => addCounselEntry(false)}
                        type="button"
                        className="mt-2"
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {selectedCompanyAttorneyId ? 'Add Attorney' : 'Add Law Firm Without Attorney'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSaveChanges}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}