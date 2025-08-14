import React, { createContext, useContext, useState, ReactNode } from 'react';

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

  const value = {
    clinic,
    setClinic,
    isAuthenticated: !!clinic,
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};