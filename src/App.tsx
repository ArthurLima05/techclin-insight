import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClinicProvider, useClinic } from "./contexts/ClinicContext";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Feedbacks from "./pages/Feedbacks";
import Agenda from "./pages/Agenda";
import Doutores from "./pages/Medicos";
import Financeiro from "./pages/Financeiro";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Componente interno que tem acesso ao contexto
const AppRoutes = () => {
  const { clinic, isAuthenticated } = useClinic();

  // Se não está autenticado, mostrar apenas login
  if (!isAuthenticated || !clinic) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Se está autenticado, mostrar as rotas protegidas
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/feedbacks" element={<Feedbacks />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/medicos" element={<Doutores />} />
        <Route path="/financeiro" element={<Financeiro />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClinicProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ClinicProvider>
  </QueryClientProvider>
);

export default App;