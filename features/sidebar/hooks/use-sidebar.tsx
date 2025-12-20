'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { SidebarContext as SidebarContextType, SidebarState } from '../types';

const SidebarContext = createContext<SidebarContextType | null>(null);

const SIDEBAR_COOKIE_NAME = 'sidebar:state';

export interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [state, setState] = useState<SidebarState>({
    isOpen: defaultOpen,
    isMobile: false,
  });

  const open = useCallback(() => {
    setState((s) => ({ ...s, isOpen: true }));
    document.cookie = `${SIDEBAR_COOKIE_NAME}=true; path=/`;
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
    document.cookie = `${SIDEBAR_COOKIE_NAME}=false; path=/`;
  }, []);

  const toggle = useCallback(() => {
    setState((s) => {
      const newOpen = !s.isOpen;
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${newOpen}; path=/`;
      return { ...s, isOpen: newOpen };
    });
  }, []);

  const setIsMobile = useCallback((isMobile: boolean) => {
    setState((s) => ({ ...s, isMobile }));
  }, []);

  // Handle keyboard shortcut (Ctrl+B / Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return (
    <SidebarContext.Provider value={{ state, open, close, toggle, setIsMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
