import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  user: any;
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Verificar se há usuário autenticado
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log('ClinicContext - Usuario atual:', user);
      setUser(user);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('ClinicContext - Auth state change:', event, session?.user);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    console.log('ClinicContext - Estado atual:', { clinic, user, isAuthenticated: !!clinic && !!user });
  }, [clinic, user]);

  const value = {
    clinic,
    setClinic,
    isAuthenticated: !!clinic && !!user, // Require both authenticated user AND clinic
    user,
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};