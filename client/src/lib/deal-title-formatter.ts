import { Deal, Company } from '@shared/schema';

/**
 * Formats a deal title as "[Company Display Name] - [Deal Title]"
 * Falls back to Company Legal Name if Display Name is blank
 * 
 * @param deal The deal object
 * @param company Optional company object. If not provided, will use deal.companyName
 * @returns Formatted deal title string
 */
export function formatDealTitle(deal: Deal, company?: Company | null): string {
  if (!deal) return '';
  
  // If we have a company object, use the display name if available, otherwise use the legal name
  if (company) {
    const companyName = company.displayName && company.displayName.trim() !== '' 
      ? company.displayName 
      : company.legalName;
    return `${companyName} - ${deal.title}`;
  }
  
  // Fall back to using the deal's company name if no company object is provided
  return `${deal.companyName} - ${deal.title}`;
}