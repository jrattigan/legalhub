import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { FileText, Search, Filter, Upload, Clock, Download, Eye } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [dealFilter, setDealFilter] = useState('all');
  const [, navigate] = useLocation();
  
  // Get all deals for filter
  const { data: deals } = useQuery({ 
    queryKey: ['/api/deals']
  });
  
  // Get all documents from all deals
  const { data: allDocuments, isLoading } = useQuery({
    queryKey: ['/api/deals/1/documents']
    // In a real app, we would have an endpoint to get all documents across deals
  });
  
  // Filter documents based on search and filters
  const filteredDocuments = allDocuments?.filter((doc: any) => {
    const matchesSearch = searchTerm === '' || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = category === 'all' || doc.category === category;
    
    // For demo purposes, let's pretend we're filtering by deal
    const matchesDeal = dealFilter === 'all' || doc.dealId.toString() === dealFilter;
    
    return matchesSearch && matchesCategory && matchesDeal;
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

  return (
    <AppLayout>
      <div className="overflow-y-auto bg-neutral-50 p-6 h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">Documents</h1>
          <Button onClick={() => {
            // Use first deal's ID for demonstration purposes
            const dealId = deals && deals.length > 0 ? deals[0].id : 1;
            navigate(`/deals/${dealId}?tab=documents&action=new`);
          }}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                <Input 
                  placeholder="Search documents..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-4">
                <Select value={dealFilter} onValueChange={setDealFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select deal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Deals</SelectItem>
                    {deals?.map((deal: any) => (
                      <SelectItem key={deal.id} value={deal.id.toString()}>
                        {deal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Ancillary">Ancillary</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Document Library</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin inline-block mb-2"></div>
                <p>Loading documents...</p>
              </div>
            ) : filteredDocuments?.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-medium mb-1">No documents found</h3>
                <p className="mb-4">No documents match your search criteria</p>
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setCategory('all');
                  setDealFilter('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deal</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Versions</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments?.map((doc: any) => (
                      <TableRow key={doc.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => navigate(`/documents/${doc.id}`)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-primary-light rounded flex items-center justify-center text-primary mr-2">
                              <FileText className="h-4 w-4" />
                            </div>
                            {doc.title}
                          </div>
                        </TableCell>
                        <TableCell>{doc.category}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(doc.status)}`}>
                            {doc.status}
                          </span>
                        </TableCell>
                        <TableCell>Deal #{doc.dealId}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1 text-neutral-400" />
                            {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{doc.versions}</TableCell>
                        <TableCell>
                          {doc.assigneeId ? (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>
                                {doc.assigneeId}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}