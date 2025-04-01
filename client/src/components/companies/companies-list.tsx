import React, { useState } from 'react';
import { Building2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';

// The companies list component that will be loaded in an iframe
export default function CompaniesList() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch companies data
  const { data: companies, isLoading } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return response.json();
    }
  });

  // Filter companies based on search query
  const filteredCompanies = companies?.filter(company => 
    company.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.legalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle click on a company
  const handleCompanyClick = (companyId: number) => {
    // Send message to parent window
    window.parent.postMessage({ type: 'NAVIGATE_TO_COMPANY', companyId }, '*');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-4 border-b border-neutral-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search companies..."
            className="pl-9 bg-neutral-50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Scrollable companies list */}
      <ScrollArea className="flex-1 companies-scrollarea">
        <div className="space-y-0.5 p-2">
          {filteredCompanies?.map((company) => (
            <div
              key={company.id}
              className="flex items-center p-3 rounded-md cursor-pointer transition-colors text-neutral-600 hover:bg-neutral-100"
              onClick={() => handleCompanyClick(company.id)}
            >
              <Building2 className="h-4 w-4 mr-3 text-neutral-400" />
              <div className="truncate">
                <div className="font-medium">{company.displayName}</div>
                <div className="text-xs text-neutral-500 truncate">{company.legalName}</div>
              </div>
            </div>
          ))}
          
          {filteredCompanies?.length === 0 && (
            <div className="text-center p-6 text-neutral-500">
              No companies found matching your search.
            </div>
          )}

          {companies?.length === 0 && (
            <div className="text-center p-6 text-neutral-500">
              No companies found. Add your first company.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}