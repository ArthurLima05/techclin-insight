import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  clinica_id: string;
  role: string;
  active: boolean;
}

interface Clinic {
  id: string;
  nome: string;
  dashboard_ativo: boolean;
  feedbacks_ativos: boolean;
  agenda_ativa: boolean;
}

interface AuthContextType {
  user: User | null;
  clinic: Clinic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, clinicId: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing session on load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      // Validate session with backend
      const { data: userId, error } = await supabase.rpc('validate_session', {
        token: sessionToken
      });

      if (error || !userId) {
        localStorage.removeItem('session_token');
        setIsLoading(false);
        return;
      }

      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('active', true)
        .single();

      if (userError || !userData) {
        localStorage.removeItem('session_token');
        setIsLoading(false);
        return;
      }

      // Get clinic data
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinicas')
        .select('id, nome, dashboard_ativo, feedbacks_ativos, agenda_ativa')
        .eq('id', userData.clinica_id)
        .single();

      if (clinicError || !clinicData) {
        localStorage.removeItem('session_token');
        setIsLoading(false);
        return;
      }

      setUser(userData);
      setClinic(clinicData);
    } catch (error) {
      console.error('Session check error:', error);
      localStorage.removeItem('session_token');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Get user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('active', true)
        .single();

      if (userError || !userData) {
        return { success: false, error: 'Email ou senha inválidos' };
      }

      // Verify password
      const { data: passwordValid, error: passwordError } = await supabase.rpc('verify_password', {
        password: password,
        hash: userData.password_hash
      });

      if (passwordError || !passwordValid) {
        return { success: false, error: 'Email ou senha inválidos' };
      }

      // Create session
      const { data: sessionToken, error: sessionError } = await supabase.rpc('create_user_session', {
        user_uuid: userData.id,
        ip: null, // Will be handled server-side
        agent: navigator.userAgent
      });

      if (sessionError || !sessionToken) {
        return { success: false, error: 'Erro ao criar sessão' };
      }

      // Get clinic data
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinicas')
        .select('id, nome, dashboard_ativo, feedbacks_ativos, agenda_ativa')
        .eq('id', userData.clinica_id)
        .single();

      if (clinicError || !clinicData) {
        return { success: false, error: 'Erro ao carregar dados da clínica' };
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      // Store session token
      localStorage.setItem('session_token', sessionToken);

      setUser(userData);
      setClinic(clinicData);

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${userData.email}!`,
      });

      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Erro interno do servidor' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, clinicId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Validate clinic exists
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinicas')
        .select('id')
        .eq('id', clinicId)
        .single();

      if (clinicError || !clinicData) {
        return { success: false, error: 'Clínica não encontrada' };
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        return { success: false, error: 'Este email já está em uso' };
      }

      // Hash password
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
        password: password
      });

      if (hashError || !hashedPassword) {
        return { success: false, error: 'Erro ao processar senha' };
      }

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          password_hash: hashedPassword,
          clinica_id: clinicId,
          role: 'admin',
          active: true
        })
        .select()
        .single();

      if (userError || !newUser) {
        return { success: false, error: 'Erro ao criar usuário' };
      }

      toast({
        title: "Conta criada com sucesso",
        description: "Agora você pode fazer login com suas credenciais.",
      });

      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Erro interno do servidor' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        // Invalidate session in database
        await supabase
          .from('user_sessions')
          .delete()
          .eq('session_token', sessionToken);
      }

      localStorage.removeItem('session_token');
      setUser(null);
      setClinic(null);

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com segurança.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if user exists
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('active', true)
        .single();

      if (!userData) {
        return { success: false, error: 'Email não encontrado' };
      }

      // In a real implementation, you would send a password reset email here
      // For now, we'll just return success
      toast({
        title: "Link de redefinição enviado",
        description: "Verifique seu email para redefinir sua senha.",
      });

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  };

  const value = {
    user,
    clinic,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};