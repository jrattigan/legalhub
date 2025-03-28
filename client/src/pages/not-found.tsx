import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="w-full flex items-center justify-center bg-gray-50 p-6 h-full">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
            </div>
            
            <p className="mb-6 text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            <div className="flex space-x-3">
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}