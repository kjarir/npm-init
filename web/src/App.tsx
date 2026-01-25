import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SmoothScrollProvider } from "@/components/smooth-scroll/SmoothScroll";
import { FabricConnectionProvider } from "@/components/blockchain/FabricConnectionProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

// Client Pages
import ClientDashboard from "./pages/client/ClientDashboard";
import BrowseFreelancers from "./pages/client/BrowseFreelancers";
import CreateProject from "./pages/client/CreateProject";
import ProjectDetail from "./pages/client/ProjectDetail";

// Freelancer Pages
import FreelancerDashboard from "./pages/freelancer/FreelancerDashboard";
import BrowseProjects from "./pages/freelancer/BrowseProjects";
import FreelancerProjectDetail from "./pages/freelancer/FreelancerProjectDetail";

// Shared Pages
import Wallet from "./pages/Wallet";
import Disputes from "./pages/Disputes";
import Chat from "./pages/Chat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FabricConnectionProvider>
        <SmoothScrollProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Client Routes */}
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/client/freelancers" element={<BrowseFreelancers />} />
              <Route path="/client/create-project" element={<CreateProject />} />
              <Route path="/client/project/:id" element={<ProjectDetail />} />
              
              {/* Freelancer Routes */}
              <Route path="/freelancer/dashboard" element={<FreelancerDashboard />} />
              <Route path="/freelancer/projects" element={<BrowseProjects />} />
              <Route path="/freelancer/project/:id" element={<FreelancerProjectDetail />} />
              
              {/* Shared Routes */}
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/disputes" element={<Disputes />} />
              <Route path="/chat" element={<Chat />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SmoothScrollProvider>
      </FabricConnectionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
