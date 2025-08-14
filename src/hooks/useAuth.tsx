import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LoginAttempt {
  timestamp: number;
  attempts: number;
}

interface AuthResult {
  success: boolean;
  error?: string;
  clinic?: any;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt>({ timestamp: 0, attempts: 0 });
  const { toast } = useToast();

  // Check if user is locked out
  const isLockedOut = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - loginAttempts.timestamp;
    
    if (loginAttempts.attempts >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION) {
      return true;
    }
    
    // Reset attempts if lockout period has passed
    if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
      setLoginAttempts({ timestamp: 0, attempts: 0 });
    }
    
    return false;
  };

  // Get remaining lockout time
  const getRemainingLockoutTime = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - loginAttempts.timestamp;
    const remainingTime = LOCKOUT_DURATION - timeSinceLastAttempt;
    
    return Math.max(0, Math.ceil(remainingTime / 1000 / 60)); // minutes
  };

  // Validate access key format
  const validateAccessKey = (key: string): { valid: boolean; error?: string } => {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: 'Chave de acesso é obrigatória' };
    }

    if (key.trim().length < 8) {
      return { valid: false, error: 'Chave de acesso deve ter pelo menos 8 caracteres' };
    }

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /['";]/,
      /\b(union|select|insert|delete|update|drop|create|alter)\b/i,
      /--|\/\*|\*\//,
      /<script>/i
    ];

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(key)) {
        return { valid: false, error: 'Formato de chave inválido' };
      }
    }

    return { valid: true };
  };

  // Record failed attempt
  const recordFailedAttempt = () => {
    const now = Date.now();
    setLoginAttempts(prev => ({
      timestamp: now,
      attempts: prev.attempts + 1
    }));
  };

  // Reset attempts on successful login
  const resetAttempts = () => {
    setLoginAttempts({ timestamp: 0, attempts: 0 });
  };

  // Authenticate user with enhanced security
  const authenticate = async (accessKey: string): Promise<AuthResult> => {
    // Check if locked out
    if (isLockedOut()) {
      const remainingTime = getRemainingLockoutTime();
      return {
        success: false,
        error: `Muitas tentativas falharam. Tente novamente em ${remainingTime} minutos.`
      };
    }

    // Validate input
    const validation = validateAccessKey(accessKey);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    setIsLoading(true);

    try {
      // Sanitize input
      const sanitizedKey = accessKey.trim().toUpperCase();

      // Add artificial delay to prevent timing attacks
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .eq('chave_acesso', sanitizedKey)
        .maybeSingle();

      // Ensure minimum response time
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }

      if (error) {
        console.error('Database error:', error);
        recordFailedAttempt();
        return { success: false, error: 'Erro interno. Tente novamente.' };
      }

      if (!data) {
        recordFailedAttempt();
        return { success: false, error: 'Chave de acesso inválida' };
      }

      // Success - reset attempts and return clinic data
      resetAttempts();
      
      // Log successful authentication (for audit)
      console.log('Successful authentication for clinic:', data.nome);
      
      return { success: true, clinic: data };

    } catch (error) {
      console.error('Authentication error:', error);
      recordFailedAttempt();
      return { success: false, error: 'Erro de conexão. Verifique sua internet.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out user
  const signOut = async () => {
    try {
      // Clear any cached data
      resetAttempts();
      
      // You could add server-side session invalidation here if needed
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: 'Erro ao sair do sistema' };
    }
  };

  return {
    authenticate,
    signOut,
    isLoading,
    isLockedOut: isLockedOut(),
    remainingLockoutTime: getRemainingLockoutTime(),
    attemptsRemaining: MAX_ATTEMPTS - loginAttempts.attempts
  };
};