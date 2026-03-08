import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import PondHome from "./pages/PondHome";
import PondSelection from "./pages/PondSelection";
import LiveSensors from "./pages/LiveSensors";
import DeviceControls from "./pages/DeviceControls";
import DeviceSchedules from "./pages/DeviceSchedules";
import ThresholdSettings from "./pages/ThresholdSettings";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import PondAlerts from "./pages/PondAlerts";
import Alerts from "./pages/Alerts";
import AdminPanel from "./pages/AdminPanel";
import AdminPondDetails from "./pages/AdminPondDetails";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Security from "./pages/Security";
import CameraDashboard from "./pages/CameraDashboard";
import AddCamera from "./pages/AddCamera";
import LiveCamera from "./pages/LiveCamera";
import CameraNetworkSetup from "./pages/CameraNetworkSetup";
import CameraDiagnostics from "./pages/CameraDiagnostics";
import NotFound from "./pages/NotFound";
import { OfflineIndicator } from "./components/OfflineIndicator";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ponds" 
        element={
          <ProtectedRoute>
            <PondSelection />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pond/:pondId" 
        element={
          <ProtectedRoute>
            <PondHome />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pond/:pondId/sensors" 
        element={
          <ProtectedRoute>
            <LiveSensors />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pond/:pondId/devices" 
        element={
          <ProtectedRoute>
            <DeviceControls />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/pond/:pondId/cameras"
        element={
          <ProtectedRoute>
            <CameraDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pond/:pondId/cameras/add"
        element={
          <ProtectedRoute>
            <AddCamera />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pond/:pondId/cameras/live/:cameraId"
        element={
          <ProtectedRoute>
            <LiveCamera />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pond/:pondId/cameras/setup"
        element={
          <ProtectedRoute>
            <CameraNetworkSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pond/:pondId/cameras/diagnostics/:cameraId"
        element={
          <ProtectedRoute>
            <CameraDiagnostics />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/pond/:pondId/schedules" 
        element={
          <ProtectedRoute>
            <DeviceSchedules />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pond/:pondId/reports" 
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pond/:pondId/alerts" 
        element={
          <ProtectedRoute>
            <PondAlerts />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings/thresholds" 
        element={
          <ProtectedRoute>
            <ThresholdSettings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings/notifications" 
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings/security" 
        element={
          <ProtectedRoute>
            <Security />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/alerts" 
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/pond/:pondId" 
        element={
          <ProtectedRoute>
            <AdminPondDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
            <OfflineIndicator />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
