import React from "react";
import { useParams } from "wouter";
import CompaniesLayout from "@/components/companies/companies-layout";
import CompanyDetailView from "@/components/companies/company-detail-view";
import { Building2 } from "lucide-react";

export default function CompaniesPage() {
  const params = useParams();
  const companyId = params.id ? parseInt(params.id) : null;

  return (
    <CompaniesLayout>
      {companyId ? (
        <CompanyDetailView companyId={companyId} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-12 max-w-md">
            <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
            <h3 className="text-xl font-medium">Select a Company</h3>
            <p className="text-neutral-500 mt-2">
              Choose a company from the list to view its details and associated deals.
            </p>
          </div>
        </div>
      )}
    </CompaniesLayout>
  );
}
