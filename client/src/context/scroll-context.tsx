import React, { createContext, useContext, useState, useCallback } from "react";

interface ScrollPositionsState {
  [key: string]: number;
}

interface ScrollContextType {
  scrollPositions: ScrollPositionsState;
  saveScrollPosition: (key: string, position: number) => void;
  getScrollPosition: (key: string) => number;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scrollPositions, setScrollPositions] = useState<ScrollPositionsState>({});

  const saveScrollPosition = useCallback((key: string, position: number) => {
    setScrollPositions((prev) => ({
      ...prev,
      [key]: position,
    }));
    // Also save to localStorage for persistence across sessions
    localStorage.setItem(`scrollPosition_${key}`, position.toString());
  }, []);

  const getScrollPosition = useCallback((key: string) => {
    // Check memory state first
    if (scrollPositions[key] !== undefined) {
      return scrollPositions[key];
    }
    
    // Then check localStorage
    const savedPosition = localStorage.getItem(`scrollPosition_${key}`);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      // Update the in-memory state
      setScrollPositions((prev) => ({
        ...prev,
        [key]: position,
      }));
      return position;
    }
    
    return 0;
  }, [scrollPositions]);

  return (
    <ScrollContext.Provider value={{ scrollPositions, saveScrollPosition, getScrollPosition }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = (): ScrollContextType => {
  const context = useContext(ScrollContext);
  if (context === undefined) {
    throw new Error("useScroll must be used within a ScrollProvider");
  }
  return context;
};