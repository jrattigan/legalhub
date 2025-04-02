import React, { useState } from 'react';
import { Building, User, Users, Mail, Phone, Edit, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LawFirm, Attorney } from '@shared/schema';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  
  // State for edit dialog
  const [editingSection, setEditingSection] = useState<EditSectionType>(null);
  
  // Dialog title mapping
  const dialogTitles = {
    leadInvestor: "Edit Lead Investor",
    investmentTeam: "Edit Investment Team",
    investorCounsel: "Edit Investor Counsel",
    companyCounsel: "Edit Company Counsel"
  };
  
  // Handle edit button click
  const handleEdit = (section: EditSectionType) => {
    setEditingSection(section);
  };
  
  // Close the dialog
  const handleCloseDialog = () => {
    setEditingSection(null);
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
              {/* Dialog content placeholder - would be implemented with form fields for each section */}
              <p className="text-sm text-neutral-500">
                Edit functionality for {editingSection} would include appropriate form fields here.
              </p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleCloseDialog}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}