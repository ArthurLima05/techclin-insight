import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { clinic, isAuthenticated } = useClinic();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !clinic) {
      navigate('/');
    }
  }, [isAuthenticated, clinic, navigate]);

  if (!isAuthenticated || !clinic) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;