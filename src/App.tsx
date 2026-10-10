import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// ponytail: one page, so no router (AUDIT P-7, saves ~37 kB). Add react-router back
// when a second route (for example /pricing) exists.
// No TooltipProvider: no component uses a tooltip (ROADMAP item 125, saves ~20 kB). Add it
// back with the first <Tooltip>.
const App = () => (
  <>
    <Toaster />
    {window.location.pathname === "/" ? <Index /> : <NotFound />}
  </>
);

export default App;
