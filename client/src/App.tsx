import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { LoadScript } from "@react-google-maps/api";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import SubmitResource from "@/pages/SubmitResource";
import VerificationReview from "@/pages/VerificationReview";
import NotFound from "@/pages/not-found";

const libraries: ("places" | "drawing" | "geometry" | "visualization" | "marker")[] = ['places', 'marker'];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/submit" component={SubmitResource} />
      <Route path="/verification-review" component={VerificationReview} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {apiKey ? (
          <LoadScript
            googleMapsApiKey={apiKey}
            libraries={libraries}
          >
            <Toaster />
            <Router />
          </LoadScript>
        ) : (
          <div className="h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center p-4">
              <p className="text-lg font-semibold text-gray-700 mb-2">Google Maps API Key Required</p>
              <p className="text-sm text-gray-600">
                Please set VITE_GOOGLE_MAPS_API_KEY in your .env file
              </p>
            </div>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
