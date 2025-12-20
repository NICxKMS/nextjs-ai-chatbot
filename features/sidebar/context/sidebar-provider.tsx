'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import type { SidebarState, SidebarActions } from '../types';

const SidebarStateContext = createContext<SidebarState | null>(null);
const SidebarActionsContext = createContext<SidebarActions | null>(null);

const MOBILE_BREAKPOINT = 768;

export function useSidebarState(): SidebarState {
  const context = useContext(SidebarStateContext);
  if (!context) {
    throw new Error('useSidebarState must be used within SidebarProvider');
  }
  return context;
}

export function useSidebarActions(): SidebarActions {
  const context = useContext(SidebarActionsContext);
  if (!context) {
    throw new Error('useSidebarActions must be used within SidebarProvider');
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: SidebarProviderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen((prev) => !prev);
    }
  }, [isMobile]);

  const stateValue = useMemo<SidebarState>(
    () => ({
      open,
      openMobile,
      isMobile,
    }),
    [open, openMobile, isMobile]
  );

  const actionsValue = useMemo<SidebarActions>(
    () => ({
      setOpen,
      setOpenMobile,
      toggleSidebar,
    }),
    [toggleSidebar]
  );

  return (
    <SidebarStateContext.Provider value={stateValue}>
      <SidebarActionsContext.Provider value={actionsValue}>
        {children}
      </SidebarActionsContext.Provider>
    </SidebarStateContext.Provider>
  );
}
