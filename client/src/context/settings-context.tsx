import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SettingsContextType {
  organizationName: string;
  isLoading: boolean;
  error: Error | null;
  refreshSettings: () => void;
}

const DEFAULT_ORG_NAME = 'Rogue Capital Ventures';

const defaultSettings: SettingsContextType = {
  organizationName: DEFAULT_ORG_NAME, // Default value
  isLoading: true,
  error: null,
  refreshSettings: () => {},
};

export const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export function useSettings() {
  return useContext(SettingsContext);
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const queryClient = useQueryClient();
  
  // Keep a local state backup for organization name to ensure it's always available
  const [localOrgName, setLocalOrgName] = useState<string>(DEFAULT_ORG_NAME);
  
  // Fetch organization name setting from API
  const {
    data: organizationSetting,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/settings/organizationName'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/settings/organizationName');
        if (!response.ok) {
          if (response.status === 404) {
            // Create organization name setting if it doesn't exist
            console.log("Organization name setting not found, creating default...");
            
            try {
              const createResponse = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  key: 'organizationName',
                  value: DEFAULT_ORG_NAME
                }),
              });
              
              if (createResponse.ok) {
                return await createResponse.json();
              }
            } catch (createError) {
              console.error('Error creating organization name setting:', createError);
            }
            
            // Still return default if create failed
            return { value: DEFAULT_ORG_NAME };
          }
          throw new Error('Failed to fetch organization name');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching organization settings:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2, // Retry failed requests twice
  });
  
  // Update local backup when organization name changes
  useEffect(() => {
    if (organizationSetting?.value) {
      setLocalOrgName(organizationSetting.value);
    }
  }, [organizationSetting]);

  // Function to refresh settings
  const refreshSettings = () => {
    console.log("Refreshing settings...");
    queryClient.invalidateQueries({ queryKey: ['/api/settings/organizationName'] });
  };

  // Get the organization name from settings or local backup
  const currentOrgName = organizationSetting?.value || localOrgName || DEFAULT_ORG_NAME;

  // Combine settings data
  const settingsValue: SettingsContextType = {
    organizationName: currentOrgName,
    isLoading,
    error: error as Error | null,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={settingsValue}>
      {children}
    </SettingsContext.Provider>
  );
}