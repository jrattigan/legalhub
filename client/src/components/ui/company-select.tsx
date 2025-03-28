import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export type Company = {
  id: number;
  displayName: string;
  legalName: string;
  url: string | null;
  bcvTeam: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

type CompanySelectProps = {
  value?: number;
  displayValue?: string;
  onValueChange: (value: number, displayName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CompanySelect({
  value,
  displayValue,
  onValueChange,
  placeholder = "Select a company",
  disabled = false,
  className,
}: CompanySelectProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for new company
  const [newCompany, setNewCompany] = useState({
    legalName: '',
    displayName: '',
    url: '',
    bcvTeam: '',
  });

  // Query to fetch companies
  const {
    data: companies = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/companies'],
    select: (data: Company[]) => data,
  });

  // Mutation to create a new company
  const createCompanyMutation = useMutation({
    mutationFn: async (newCompanyData: any) => {
      return await apiRequest('/api/companies', 'POST', newCompanyData);
    },
    onSuccess: async (response) => {
      const newCompany = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setDialogOpen(false);
      toast({
        title: 'Company Created',
        description: `${newCompany.displayName} has been created successfully.`,
      });
      onValueChange(newCompany.id, newCompany.displayName);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Company',
        description: 'There was an error creating the company. Please try again.',
        variant: 'destructive',
      });
      console.error('Error creating company:', error);
    },
  });

  // Reset the form
  const resetForm = () => {
    setNewCompany({
      legalName: '',
      displayName: '',
      url: '',
      bcvTeam: '',
    });
  };

  // Handle input change for new company form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCompany({ ...newCompany, [name]: value });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare bcvTeam as an array from comma-separated input
    const bcvTeamArray = newCompany.bcvTeam.trim() !== '' 
      ? newCompany.bcvTeam.split(',').map(item => item.trim())
      : [];
    
    createCompanyMutation.mutate({
      ...newCompany,
      bcvTeam: bcvTeamArray,
    });
  };

  // Close dialog when clicking outside
  const handleDialogClose = () => {
    if (!createCompanyMutation.isPending) {
      setDialogOpen(false);
      resetForm();
    }
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            {value && displayValue
              ? displayValue
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <Command>
            <CommandInput placeholder="Search company..." />
            <CommandList>
              <CommandEmpty>No company found.</CommandEmpty>
              <CommandGroup>
                {isLoading ? (
                  <div className="p-2 text-sm text-neutral-500">Loading companies...</div>
                ) : error ? (
                  <div className="p-2 text-sm text-destructive">Error loading companies</div>
                ) : (
                  companies.map((company) => (
                    <CommandItem
                      key={company.id}
                      value={company.displayName}
                      onSelect={() => {
                        onValueChange(company.id, company.displayName);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === company.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {company.displayName}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new company
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Create a new company to add to your deals.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="legalName" className="text-right">
                  Legal Name
                </Label>
                <Input
                  id="legalName"
                  name="legalName"
                  value={newCompany.legalName}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayName" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={newCompany.displayName}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">
                  Website URL
                </Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  value={newCompany.url}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bcvTeam" className="text-right">
                  BCV Team
                </Label>
                <Input
                  id="bcvTeam"
                  name="bcvTeam"
                  value={newCompany.bcvTeam}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Add names separated by commas"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleDialogClose}
                disabled={createCompanyMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createCompanyMutation.isPending}
              >
                {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}