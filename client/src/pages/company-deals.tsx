import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function CompanyDealsPage() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const companyId = params.id;
  
  useEffect(() => {
    // Redirect to the company detail page which now also shows the deals
    navigate(`/companies/${companyId}`);
  }, [companyId, navigate]);

  return null; // No UI needed as we're redirecting
}