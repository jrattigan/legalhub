import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, Filter, ListFilter, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Deal, User } from '@shared/schema';
import { format } from 'date-fns';

type DealWithUsers = Deal & { users: User[] };

interface DealsListProps {
  deals: DealWithUsers[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  selectedDealId?: number;
}

export default function DealsList({ deals, activeFilter, setActiveFilter, selectedDealId }: DealsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [, navigate] = useLocation();

  const filters = [
    { id: 'all', name: 'All Deals' },
    { id: 'active', name: 'Active' },
    { id: 'pending', name: 'Pending' },
    { id: 'completed', name: 'Completed' },
    { id: 'urgent', name: 'Urgent' },
  ];

  // Apply filters and search
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchTerm === '' || 
      deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.dealId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || deal.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-secondary-light text-secondary';
      case 'in-progress':
        return 'bg-warning-light text-warning';
      case 'urgent':
        return 'bg-destructive-light text-destructive';
      case 'draft':
        return 'bg-neutral-200 text-neutral-600';
      case 'pending':
        return 'bg-neutral-100 text-neutral-600';
      default:
        return 'bg-neutral-200 text-neutral-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'urgent':
        return 'Urgent';
      case 'draft':
        return 'Draft';
      case 'pending':
        return 'Pending';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleDealClick = (id: number) => {
    navigate(`/deals/${id}`);
  };

  return (
    <div className="w-64 lg:w-80 border-r border-neutral-200 bg-white flex-shrink-0 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-neutral-800">Deals</h2>
          <div className="flex">
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
              <ListFilter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
          <Input 
            className="w-full pl-8 pr-3 py-1.5 h-9 text-sm" 
            placeholder="Search deals..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full px-2.5 py-1 h-6 text-xs whitespace-nowrap ${
                activeFilter === filter.id 
                  ? '' 
                  : 'border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800'
              }`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredDeals.length === 0 ? (
          <div className="p-3 text-center text-neutral-500 text-sm">
            No deals found matching your criteria
          </div>
        ) : (
          filteredDeals.map((deal) => (
            <div 
              key={deal.id}
              className={`p-3 border-b border-neutral-200 cursor-pointer hover:bg-neutral-50 ${
                selectedDealId === deal.id ? 'bg-neutral-50' : ''
              }`}
              onClick={() => handleDealClick(deal.id)}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-neutral-800">{deal.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClasses(deal.status)}`}>
                  {getStatusLabel(deal.status)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center text-xs text-neutral-500">
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  {deal.dueDate ? (
                    deal.status === 'completed' ? 
                      `Closed: ${format(new Date(deal.dueDate), 'MMM dd, yyyy')}` : 
                      `Due: ${format(new Date(deal.dueDate), 'MMM dd, yyyy')}`
                  ) : 'No due date'}
                </span>
              </div>
              <div className="mt-2 text-xs text-neutral-600">
                <p>{deal.description}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex -space-x-1">
                    {deal.users.slice(0, 3).map((user) => (
                      <div 
                        key={user.id}
                        className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs border border-white"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.initials}
                      </div>
                    ))}
                    {deal.users.length > 3 && (
                      <div className="h-5 w-5 rounded-full bg-neutral-300 flex items-center justify-center text-white text-xs border border-white">
                        +{deal.users.length - 3}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-neutral-500">
                  <FileText className="w-3 h-3 inline mr-1" />
                  <span>12 docs</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
