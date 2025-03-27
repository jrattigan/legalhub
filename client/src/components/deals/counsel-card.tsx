import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Mail, Phone } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { LawFirm, Attorney, insertDealCounselSchema } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface CounselCardProps {
  counsel: {
    id: number;
    lawFirm: LawFirm;
    attorney?: Attorney;
    role: string;
  }[];
  onRefreshData: () => void;
  preview?: boolean;
  dealId?: number;
}

export default function CounselCard({ counsel, onRefreshData, preview = false, dealId }: CounselCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFirmId, setSelectedFirmId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Get law firms for dropdown
  const { data: lawFirms } = useQuery({
    queryKey: ['/api/law-firms'],
    enabled: isDialogOpen
  });

  // Get attorneys for selected firm
  const { data: attorneys } = useQuery({
    queryKey: [`/api/law-firms/${selectedFirmId}/attorneys`],
    enabled: isDialogOpen && selectedFirmId !== null
  });

  // Add counsel mutation
  const addCounselMutation = useMutation({
    mutationFn: async (data: z.infer<typeof counselSchema>) => {
      const response = await apiRequest('POST', '/api/deal-counsels', {
        ...data,
        dealId: dealId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deals/${dealId}/counsel`] });
      setIsDialogOpen(false);
      onRefreshData();
      form.reset();
    }
  });

  // Form validation schema
  const counselSchema = insertDealCounselSchema.extend({
    attorneyId: z.union([z.number(), z.string()]).optional().transform(val => 
      val === '' || val === 'none' ? undefined : typeof val === 'string' ? parseInt(val) : val
    )
  });

  const form = useForm<z.infer<typeof counselSchema>>({
    resolver: zodResolver(counselSchema),
    defaultValues: {
      lawFirmId: undefined,
      role: 'Supporting',
      attorneyId: undefined
    }
  });

  const onSubmit = (data: z.infer<typeof counselSchema>) => {
    addCounselMutation.mutate(data);
  };

  // Watch for law firm changes to load attorneys
  const watchedFirmId = form.watch('lawFirmId');
  React.useEffect(() => {
    if (watchedFirmId) {
      setSelectedFirmId(typeof watchedFirmId === 'string' ? parseInt(watchedFirmId) : watchedFirmId);
    } else {
      setSelectedFirmId(null);
    }
  }, [watchedFirmId]);

  return (
    <div className={`bg-white rounded-lg border border-neutral-200 shadow-sm p-4 ${preview ? 'col-span-1' : 'col-span-full md:col-span-1'}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium text-neutral-800">Outside Counsel</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="link" className="text-xs text-primary hover:text-primary-dark" disabled={!dealId}>
              + Add Counsel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Outside Counsel</DialogTitle>
              <DialogDescription>
                Assign a law firm and attorney to this deal
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="lawFirmId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Law Firm</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select law firm" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lawFirms?.map((firm: LawFirm) => (
                            <SelectItem key={firm.id} value={firm.id.toString()}>
                              {firm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Lead Counsel">Lead Counsel</SelectItem>
                          <SelectItem value="Supporting">Supporting</SelectItem>
                          <SelectItem value="Specialty Counsel">Specialty Counsel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="attorneyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Attorney</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString() || "none"}
                        disabled={!selectedFirmId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedFirmId ? "Select attorney" : "Select a law firm first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific attorney</SelectItem>
                          {attorneys?.map((attorney: Attorney) => (
                            <SelectItem key={attorney.id} value={attorney.id.toString()}>
                              {attorney.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={addCounselMutation.isPending}
                  >
                    {addCounselMutation.isPending ? 'Adding...' : 'Add Counsel'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-3">
        {counsel.length === 0 && !preview ? (
          <div className="text-center py-8 text-neutral-500">
            <div className="mb-2">No outside counsel assigned to this deal</div>
            {dealId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> 
                Add Counsel
              </Button>
            )}
          </div>
        ) : (
          counsel.slice(0, preview ? 2 : undefined).map((item) => (
            <div 
              key={item.id} 
              className="p-3 rounded-md border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{item.lawFirm.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{item.lawFirm.specialty}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  item.role === 'Lead Counsel' ? 'bg-primary-light text-primary' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {item.role}
                </span>
              </div>
              
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
          ))
        )}
        
        {preview && counsel.length > 2 && (
          <Button 
            variant="link" 
            className="w-full text-center text-xs text-primary border-t border-neutral-100 pt-2 mt-2 hover:text-primary-dark"
          >
            View all counsel ({counsel.length})
          </Button>
        )}
      </div>
    </div>
  );
}
