import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function CompanyDetailPage() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const companyId = params.id;
  
  useEffect(() => {
    // Redirect to the new Companies page which now handles company detail views
    navigate(`/companies/${companyId}`);
  }, [companyId, navigate]);

  return null; // No UI needed as we're redirecting
}