import { lazy } from "react";
import LazyPart from "./components/LazyPart";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Toasts are rare: the Toaster loads after the first sky (ROADMAP item 174). A toast made before
// it is there shows when it mounts (the toast store keeps it).
const Toaster = lazy(() => import("@/components/ui/toaster").then(module => ({ default: module.Toaster })));

// ponytail: one page, so no router (AUDIT P-7, saves ~37 kB). Add react-router back
// when a second route (for example /pricing) exists.
// No TooltipProvider: no component uses a tooltip (ROADMAP item 125, saves ~20 kB). Add it
// back with the first <Tooltip>.
const App = () => (
  <>
    <LazyPart><Toaster /></LazyPart>
    {window.location.pathname === "/" ? <Index /> : <NotFound />}
  </>
);

export default App;
