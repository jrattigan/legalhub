import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from '@/components/ui/form';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, PlusCircle, Users, Mail, Phone, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { LawFirm, Attorney, insertLawFirmSchema, insertAttorneySchema } from '@shared/schema';

export default function Counsel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('firms');
  const [isLawFirmDialogOpen, setIsLawFirmDialogOpen] = useState(false);
  const [isAttorneyDialogOpen, setIsAttorneyDialogOpen] = useState(false);
  const [selectedFirmId, setSelectedFirmId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  // Get all law firms
  const { data: lawFirms, isLoading: firmsLoading } = useQuery({ 
    queryKey: ['/api/law-firms']
  });
  
  // Get attorneys for selected firm
  const { data: attorneys, isLoading: attorneysLoading } = useQuery({
    queryKey: [`/api/law-firms/${selectedFirmId}/attorneys`],
    enabled: !!selectedFirmId
  });
  
  // Create law firm mutation
  const lawFirmMutation = useMutation({
    mutationFn: async (data: z.infer<typeof lawFirmSchema>) => {
      const response = await apiRequest('POST', '/api/law-firms', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/law-firms'] });
      setIsLawFirmDialogOpen(false);
      lawFirmForm.reset();
    }
  });
  
  // Create attorney mutation
  const attorneyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof attorneySchema>) => {
      const response = await apiRequest('POST', '/api/attorneys', {
        ...data,
        lawFirmId: selectedFirmId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/law-firms/${selectedFirmId}/attorneys`] });
      setIsAttorneyDialogOpen(false);
      attorneyForm.reset();
    }
  });
  
  // Form validation schemas
  const lawFirmSchema = insertLawFirmSchema;
  const attorneySchema = insertAttorneySchema.omit({ lawFirmId: true });
  
  // Create forms
  const lawFirmForm = useForm<z.infer<typeof lawFirmSchema>>({
    resolver: zodResolver(lawFirmSchema),
    defaultValues: {
      name: '',
      specialty: '',
      email: '',
      phone: ''
    }
  });
  
  const attorneyForm = useForm<z.infer<typeof attorneySchema>>({
    resolver: zodResolver(attorneySchema),
    defaultValues: {
      name: '',
      position: '',
      email: '',
      phone: '',
      initials: '',
      avatarColor: '#9333ea' // Default color
    }
  });
  
  // Handle attorney creation - calculate initials from name
  const handleAttorneyNameChange = (name: string) => {
    if (name) {
      const nameParts = name.trim().split(' ');
      let initials = '';
      
      if (nameParts.length >= 2) {
        initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
      } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
        initials = nameParts[0].substring(0, 2);
      } else if (nameParts[0].length === 1) {
        initials = nameParts[0][0];
      }
      
      attorneyForm.setValue('initials', initials.toUpperCase());
    }
  };
  
  // Avatar color options
  const avatarColors = [
    '#22c55e', // green-600
    '#ea580c', // orange-600
    '#2563eb', // blue-600
    '#9333ea', // purple-600
    '#e11d48', // rose-600
    '#0891b2', // cyan-600
    '#4f46e5'  // indigo-600
  ];
  
  // Filter law firms based on search term
  const filteredLawFirms = lawFirms?.filter((firm: LawFirm) => 
    searchTerm === '' || 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    firm.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const handleSubmitLawFirm = (data: z.infer<typeof lawFirmSchema>) => {
    lawFirmMutation.mutate(data);
  };
  
  const handleSubmitAttorney = (data: z.infer<typeof attorneySchema>) => {
    attorneyMutation.mutate(data);
  };
  
  return (
    <AppLayout>
      <div className="overflow-y-auto bg-neutral-50 p-6 h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">Outside Counsel</h1>
          <div className="flex space-x-2">
            <Dialog open={isLawFirmDialogOpen} onOpenChange={setIsLawFirmDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Law Firm
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Law Firm</DialogTitle>
                  <DialogDescription>
                    Enter the details of the law firm you want to add.
                  </DialogDescription>
                </DialogHeader>
                <Form {...lawFirmForm}>
                  <form onSubmit={lawFirmForm.handleSubmit(handleSubmitLawFirm)} className="space-y-4">
                    <FormField
                      control={lawFirmForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firm Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter firm name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={lawFirmForm.control}
                      name="specialty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialty</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Corporate Securities, IP Law" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={lawFirmForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={lawFirmForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={lawFirmMutation.isPending}
                      >
                        {lawFirmMutation.isPending ? 'Saving...' : 'Save Law Firm'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAttorneyDialogOpen} onOpenChange={setIsAttorneyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Add Attorney
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Attorney</DialogTitle>
                  <DialogDescription>
                    Enter the details of the attorney you want to add.
                  </DialogDescription>
                </DialogHeader>
                <Form {...attorneyForm}>
                  <form onSubmit={attorneyForm.handleSubmit(handleSubmitAttorney)} className="space-y-4">
                    <FormField
                      control={attorneyForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter full name" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e);
                                handleAttorneyNameChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={attorneyForm.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Partner">Partner</SelectItem>
                                <SelectItem value="Senior Associate">Senior Associate</SelectItem>
                                <SelectItem value="Associate">Associate</SelectItem>
                                <SelectItem value="Junior Associate">Junior Associate</SelectItem>
                                <SelectItem value="Of Counsel">Of Counsel</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={attorneyForm.control}
                        name="initials"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initials</FormLabel>
                            <FormControl>
                              <Input maxLength={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={attorneyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={attorneyForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={attorneyForm.control}
                      name="avatarColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar Color</FormLabel>
                          <div className="flex space-x-2">
                            {avatarColors.map((color) => (
                              <div 
                                key={color}
                                className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                                  field.value === color ? 'border-primary' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => attorneyForm.setValue('avatarColor', color)}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={attorneyMutation.isPending || !selectedFirmId}
                      >
                        {attorneyMutation.isPending ? 'Saving...' : 'Save Attorney'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search law firms and attorneys..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="firms">Law Firms</TabsTrigger>
            <TabsTrigger value="attorneys">Attorneys</TabsTrigger>
          </TabsList>
          
          <TabsContent value="firms">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Law Firms</CardTitle>
                <CardDescription>
                  Manage outside counsel firms and their information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {firmsLoading ? (
                  <div className="py-20 text-center">
                    <div className="w-12 h-12 border-4 border-t-primary border-primary/30 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-neutral-500">Loading law firms...</p>
                  </div>
                ) : filteredLawFirms.length === 0 ? (
                  <div className="py-20 text-center">
                    <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No law firms found</h3>
                    <p className="text-neutral-500 mb-6">
                      {searchTerm ? `No results matching "${searchTerm}"` : "You haven't added any law firms yet"}
                    </p>
                    <Button onClick={() => setIsLawFirmDialogOpen(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Law Firm
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Firm Name</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLawFirms.map((firm: LawFirm) => (
                        <TableRow key={firm.id}>
                          <TableCell className="font-medium">{firm.name}</TableCell>
                          <TableCell>{firm.specialty}</TableCell>
                          <TableCell>{firm.email}</TableCell>
                          <TableCell>{firm.phone || '—'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedFirmId(firm.id)}>
                              View Attorneys
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="attorneys">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Attorneys</CardTitle>
                <CardDescription>
                  {selectedFirmId && lawFirms ? 
                    `Attorneys at ${lawFirms.find((f: LawFirm) => f.id === selectedFirmId)?.name}` : 
                    'Select a law firm to view its attorneys'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedFirmId ? (
                  <div className="py-20 text-center">
                    <User className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No law firm selected</h3>
                    <p className="text-neutral-500 mb-6">
                      Please select a law firm to view its attorneys
                    </p>
                    <Select onValueChange={(value) => setSelectedFirmId(Number(value))}>
                      <SelectTrigger className="w-[280px] mx-auto">
                        <SelectValue placeholder="Select a law firm" />
                      </SelectTrigger>
                      <SelectContent>
                        {lawFirms?.map((firm: LawFirm) => (
                          <SelectItem key={firm.id} value={firm.id.toString()}>
                            {firm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : attorneysLoading ? (
                  <div className="py-20 text-center">
                    <div className="w-12 h-12 border-4 border-t-primary border-primary/30 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-neutral-500">Loading attorneys...</p>
                  </div>
                ) : !attorneys || attorneys.length === 0 ? (
                  <div className="py-20 text-center">
                    <User className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No attorneys found</h3>
                    <p className="text-neutral-500 mb-6">
                      This law firm doesn't have any attorneys yet
                    </p>
                    <Button 
                      onClick={() => setIsAttorneyDialogOpen(true)}
                      disabled={!selectedFirmId}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Attorney
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attorneys?.map((attorney: Attorney) => (
                        <TableRow key={attorney.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2" style={{ backgroundColor: attorney.avatarColor }}>
                                <AvatarFallback>{attorney.initials}</AvatarFallback>
                              </Avatar>
                              {attorney.name}
                            </div>
                          </TableCell>
                          <TableCell>{attorney.position}</TableCell>
                          <TableCell>{attorney.email}</TableCell>
                          <TableCell>{attorney.phone || '—'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}