import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-primary/20 flex items-center justify-center">
            <Search className="w-10 h-10 text-primary/60" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>404</h1>
          <p className="text-lg text-muted-foreground">
            The page <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code> doesn't exist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="default">
            <Link to="/"><Home className="w-4 h-4 mr-2" /> Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <span className="cursor-pointer"><ArrowLeft className="w-4 h-4 mr-2" /> Go Back</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
