import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Clinic {
  id: string;
  nome: string;
  chave_acesso: string;
  dashboard_ativo: boolean;
  feedbacks_ativos: boolean;
  agenda_ativa: boolean;
}

interface ClinicContextType {
  clinic: Clinic | null;
  setClinic: (clinic: Clinic | null) => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};

interface ClinicProviderProps {
  children: ReactNode;
}

export const ClinicProvider: React.FC<ClinicProviderProps> = ({ children }) => {
  const [clinic, setClinic] = useState<Clinic | null>(null);

  // Enhanced session management with security checks
  useEffect(() => {
    // Check for existing session in localStorage
    const savedClinic = localStorage.getItem('techclin_session');
    if (savedClinic) {
      try {
        const parsedClinic = JSON.parse(savedClinic);
        // Validate session hasn't expired (24 hours)
        const sessionTime = localStorage.getItem('techclin_session_time');
        if (sessionTime) {
          const sessionDate = new Date(sessionTime);
          const now = new Date();
          const hoursDiff = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            setClinic(parsedClinic);
          } else {
            // Session expired, clear it
            localStorage.removeItem('techclin_session');
            localStorage.removeItem('techclin_session_time');
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem('techclin_session');
        localStorage.removeItem('techclin_session_time');
      }
    }
  }, []);

  // Save session when clinic changes
  const setClinicWithSession = (newClinic: Clinic | null) => {
    setClinic(newClinic);
    if (newClinic) {
      localStorage.setItem('techclin_session', JSON.stringify(newClinic));
      localStorage.setItem('techclin_session_time', new Date().toISOString());
    } else {
      localStorage.removeItem('techclin_session');
      localStorage.removeItem('techclin_session_time');
    }
  };

  // Enhanced sign out with session cleanup
  const signOut = () => {
    setClinic(null);
    localStorage.removeItem('techclin_session');
    localStorage.removeItem('techclin_session_time');
    // Clear any other sensitive data
    localStorage.removeItem('techclin_cache');
  };

  const value = {
    clinic,
    setClinic: setClinicWithSession,
    signOut,
    isAuthenticated: !!clinic,
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};