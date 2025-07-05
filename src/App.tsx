import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DelphinusReactProvider, setProviderConfig } from 'zkwasm-minirollup-browser';
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { MarketProvider } from "./contexts/MarketContext";
import Index from "./pages/Index";
import MarketList from "./pages/MarketList";
import NotFound from "./pages/NotFound";

// Configure the provider before app initialization
setProviderConfig({ type: 'rainbow' });

const queryClient = new QueryClient();

const App = () => (
  <DelphinusReactProvider appName="ZKWASM-PREDICTION-MARKET">
    <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<MarketList />} />
              <Route path="/:marketId" element={
                <MarketProvider>
                  <Index />
                </MarketProvider>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </BrowserRouter>
    </QueryClientProvider>
  </DelphinusReactProvider>
);

export default App;
