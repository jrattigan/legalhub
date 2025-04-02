import React, { useState } from 'react';
import { Building, User, Users, Mail, Phone, Edit, Plus, X, Check, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LawFirm, Attorney } from '@shared/schema';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';

interface WorkingGroupCardProps {
  counsel: {
    id: number;
    lawFirm: LawFirm;
    attorney?: Attorney;
    role: string;
  }[];
  dealId: number;
  companyName: string;
  bcvTeam?: string[];
  leadInvestor?: string;
  onRefreshData: () => void;
}

// Type for tracking which section is being edited
type EditSectionType = 'leadInvestor' | 'investmentTeam' | 'investorCounsel' | 'companyCounsel' | null;

export default function WorkingGroupCard({ 
  counsel, 
  dealId, 
  companyName,
  bcvTeam = [],
  leadInvestor,
  onRefreshData 
}: WorkingGroupCardProps) {
  // Split the counsel into investor and company counsel
  // For demo purposes, we'll treat Cooley LLP as investor counsel
  // and Gunderson Dettmer as company counsel
  const investorCounsel = counsel.filter(item => item.lawFirm.id === 1);
  const companyCounsel = counsel.filter(item => item.lawFirm.id === 3);
  
  // State for edit dialog and form values
  const [editingSection, setEditingSection] = useState<EditSectionType>(null);
  const [selectedLeadInvestor, setSelectedLeadInvestor] = useState<string>(leadInvestor || '');
  const [teamMembers, setTeamMembers] = useState<string[]>(bcvTeam || []);
  const [newTeamMember, setNewTeamMember] = useState<string>('');
  const [selectedInvestorCounsel, setSelectedInvestorCounsel] = useState<number | null>(investorCounsel[0]?.lawFirm.id || null);
  const [selectedCompanyCounsel, setSelectedCompanyCounsel] = useState<number | null>(companyCounsel[0]?.lawFirm.id || null);
  
  // Fetch lead investors data
  const { data: leadInvestors = [] } = useQuery<string[]>({
    queryKey: ['/api/lead-investors'],
  });
  
  // Fetch law firms data
  const { data: lawFirms = [] } = useQuery<LawFirm[]>({
    queryKey: ['/api/law-firms'],
  });
  
  // Initialize dialog form data when opened
  const handleEdit = (section: EditSectionType) => {
    // Reset form data based on current values
    if (section === 'leadInvestor') {
      setSelectedLeadInvestor(leadInvestor || '');
    } else if (section === 'investmentTeam') {
      setTeamMembers([...bcvTeam]);
      setNewTeamMember('');
    } else if (section === 'investorCounsel') {
      setSelectedInvestorCounsel(investorCounsel[0]?.lawFirm.id || null);
    } else if (section === 'companyCounsel') {
      setSelectedCompanyCounsel(companyCounsel[0]?.lawFirm.id || null);
    }
    
    setEditingSection(section);
  };
  
  // Close the dialog
  const handleCloseDialog = () => {
    setEditingSection(null);
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
      const response = await fetch(`/api/companies/1`, { // Assuming company ID is 1
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
  
  // Function to update counsel
  const updateCounsel = async (data: any) => {
    try {
      // Add the dealId to the data
      const counselData = {
        ...data,
        dealId: dealId
      };
      
      console.log("Sending counsel update to /api/deal-counsels:", counselData);
      
      const response = await fetch(`/api/deal-counsels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(counselData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response error:', errorText);
        throw new Error(`Failed to update counsel: ${response.status} ${response.statusText}`);
      }
      
      // For empty responses, just return success
      if (response.headers.get('content-length') === '0') {
        return { success: true };
      }
      
      try {
        return await response.json();
      } catch (parseError) {
        console.log('Response was not JSON, but request succeeded');
        return { success: true };
      }
    } catch (error) {
      console.error('Error updating counsel:', error);
      throw error;
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
        console.log('Updating investment team to:', teamMembers);
        const result = await updateCompany({ bcvTeam: teamMembers });
        console.log('Investment team update result:', result);
      } 
      else if (editingSection === 'investorCounsel') {
        if (selectedInvestorCounsel) {
          console.log('Updating investor counsel to law firm ID:', selectedInvestorCounsel);
          
          // Create the investor counsel data
          const counselData = {
            lawFirmId: parseInt(selectedInvestorCounsel.toString()),
            role: 'Lead Counsel'
          };
          
          console.log('Sending investor counsel update with data:', counselData);
          const result = await updateCounsel(counselData);
          console.log('Investor counsel update result:', result);
        } else {
          console.log('No investor counsel selected, skipping update');
        }
      } 
      else if (editingSection === 'companyCounsel') {
        if (selectedCompanyCounsel) {
          console.log('Updating company counsel to law firm ID:', selectedCompanyCounsel);
          
          // Create the company counsel data
          const counselData = {
            lawFirmId: parseInt(selectedCompanyCounsel.toString()),
            role: 'Supporting'
          };
          
          console.log('Sending company counsel update with data:', counselData);
          const result = await updateCounsel(counselData);
          console.log('Company counsel update result:', result);
        } else {
          console.log('No company counsel selected, skipping update');
        }
      }
      
      // Refresh all data
      console.log('Updates successful, refreshing data');
      onRefreshData();
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating data:', error);
      // In a real app, we would show an error toast here
    }
  };
  
  // Handle add new team member
  const handleAddTeamMember = () => {
    if (newTeamMember.trim()) {
      setTeamMembers([...teamMembers, newTeamMember.trim()]);
      setNewTeamMember('');
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
                <div className="font-medium">{leadInvestor}</div>
              ) : (
                <div className="text-xs text-neutral-500 italic">No lead investor assigned</div>
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
                {bcvTeam.length > 0 ? <Edit className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {bcvTeam.length > 0 ? "Edit" : "Add"}
              </Button>
            </div>
            <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50">
              {bcvTeam.length > 0 ? (
                <div className="space-y-2">
                  {bcvTeam.map((member, index) => (
                    <div key={index} className="flex items-center">
                      <Avatar className="h-6 w-6 bg-primary-light">
                        <AvatarFallback>{member.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="ml-2 text-sm">{member}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic">No investment team assigned</div>
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
                {investorCounsel.map((item) => (
                  <div key={item.id}>
                    <div className="font-medium">{item.lawFirm.name}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{item.lawFirm.specialty}</div>
                    
                    {item.attorney && (
                      <div className="mt-3 flex items-center">
                        <Avatar className="h-6 w-6" style={{ backgroundColor: item.attorney.avatarColor }}>
                          <AvatarFallback>{item.attorney.initials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-2">
                          <div className="text-sm font-medium">{item.attorney.name}</div>
                          <div className="text-xs text-neutral-500">{item.attorney.position}</div>
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
                    )}
                  </div>
                ))}
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
                {companyCounsel.map((item) => (
                  <div key={item.id}>
                    <div className="font-medium">{item.lawFirm.name}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{item.lawFirm.specialty}</div>
                    
                    {item.attorney && (
                      <div className="mt-3 flex items-center">
                        <Avatar className="h-6 w-6" style={{ backgroundColor: item.attorney.avatarColor }}>
                          <AvatarFallback>{item.attorney.initials}</AvatarFallback>
                        </Avatar>
                        <div className="ml-2">
                          <div className="text-sm font-medium">{item.attorney.name}</div>
                          <div className="text-xs text-neutral-500">{item.attorney.position}</div>
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
                    )}
                  </div>
                ))}
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
      {editingSection && (
        <Dialog open={!!editingSection} onOpenChange={handleCloseDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{dialogTitles[editingSection]}</DialogTitle>
              <DialogDescription>
                {editingSection === 'leadInvestor' ? 
                  'Update the lead investor for this deal.' : 
                  editingSection === 'investmentTeam' ? 
                  'Edit investment team members.' : 
                  editingSection === 'investorCounsel' ? 
                  'Edit investor counsel information.' : 
                  'Edit company counsel information.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {/* Lead Investor Form */}
              {editingSection === 'leadInvestor' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="leadInvestor">Lead Investor</Label>
                    <Select 
                      value={selectedLeadInvestor} 
                      onValueChange={setSelectedLeadInvestor}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lead investor" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadInvestors.map((investor) => (
                          <SelectItem key={investor} value={investor}>
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
                  <div className="space-y-2">
                    <Label>Current Team Members</Label>
                    {teamMembers.length > 0 ? (
                      <div className="space-y-2 p-3 border rounded-md">
                        {teamMembers.map((member, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 bg-primary-light mr-2">
                                <AvatarFallback>{member.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{member}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={() => handleRemoveTeamMember(index)}
                            >
                              <X className="h-4 w-4 text-neutral-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-500 italic">No team members added yet</div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newTeamMember">Add Team Member</Label>
                    <div className="flex space-x-2">
                      <Input 
                        id="newTeamMember"
                        placeholder="Full name" 
                        value={newTeamMember}
                        onChange={(e) => setNewTeamMember(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddTeamMember}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Investor Counsel Form */}
              {editingSection === 'investorCounsel' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="investorCounsel">Investor Counsel</Label>
                    <Select 
                      value={selectedInvestorCounsel?.toString() || ''} 
                      onValueChange={(value) => setSelectedInvestorCounsel(parseInt(value))}
                    >
                      <SelectTrigger id="investorCounsel">
                        <SelectValue placeholder="Select law firm" />
                      </SelectTrigger>
                      <SelectContent>
                        {lawFirms.filter(firm => 
                          [1, 3, 5, 8, 9, 10].includes(firm.id)
                        ).map((firm) => (
                          <SelectItem key={firm.id} value={firm.id.toString()}>
                            {firm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {/* Company Counsel Form */}
              {editingSection === 'companyCounsel' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyCounsel">Company Counsel</Label>
                    <Select 
                      value={selectedCompanyCounsel?.toString() || ''} 
                      onValueChange={(value) => setSelectedCompanyCounsel(parseInt(value))}
                    >
                      <SelectTrigger id="companyCounsel">
                        <SelectValue placeholder="Select law firm" />
                      </SelectTrigger>
                      <SelectContent>
                        {lawFirms.filter(firm => 
                          [2, 4, 6, 7].includes(firm.id)
                        ).map((firm) => (
                          <SelectItem key={firm.id} value={firm.id.toString()}>
                            {firm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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