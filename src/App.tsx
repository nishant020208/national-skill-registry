import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import TrainerDashboard from "./pages/TrainerDashboard.tsx";
import PrincipalDashboard from "./pages/PrincipalDashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import PassportBrowse from "./pages/PassportBrowse.tsx";
import Verify from "./pages/Verify.tsx";
import About from "./pages/About.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/verify/:studentId" element={<Verify />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/trainer" element={<ProtectedRoute roles={["trainer", "principal", "iti_admin"]}><TrainerDashboard /></ProtectedRoute>} />
            <Route path="/principal" element={<ProtectedRoute roles={["principal", "iti_admin"]}><PrincipalDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={["iti_admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/passport" element={<ProtectedRoute><PassportBrowse /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
