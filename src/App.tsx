import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// ponytail: one page, so no router (AUDIT P-7, saves ~37 kB). Add react-router back
// when a second route (for example /pricing) exists.
const App = () => (
  <TooltipProvider>
    <Toaster />
    {window.location.pathname === "/" ? <Index /> : <NotFound />}
  </TooltipProvider>
);

export default App;
