import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SettingsContextType {
  organizationName: string;
  isLoading: boolean;
  error: Error | null;
  refreshSettings: () => void;
}

const defaultSettings: SettingsContextType = {
  organizationName: 'My Organization', // Default value
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
            // Return default value if setting doesn't exist yet
            return { value: 'Rogue Capital Ventures' };
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
  });

  // Function to refresh settings
  const refreshSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/settings/organizationName'] });
  };

  // Combine settings data
  const settingsValue: SettingsContextType = {
    organizationName: organizationSetting?.value || defaultSettings.organizationName,
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