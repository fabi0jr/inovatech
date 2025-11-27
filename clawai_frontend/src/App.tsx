import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import LiveMonitor from '@/pages/LiveMonitor';
import Training from '@/pages/Training';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/live-monitor" replace />} />
          <Route path="/live-monitor" element={<LiveMonitor />} />
          <Route path="/training" element={<Training />} />
          <Route path="/dashboard" element={<Navigate to="/live-monitor" replace />} />
          <Route path="/detection-insights" element={<Navigate to="/live-monitor" replace />} />
          <Route path="/settings" element={<Navigate to="/live-monitor" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;