import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { PracticeBrandingProvider } from "@/practice/branding/PracticeBrandingProvider";
import { PracticeFeaturesProvider } from "@/practice/features/PracticeFeaturesProvider";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PracticeBrandingProvider>
      <PracticeFeaturesProvider>
        <div className="flex min-h-screen w-full">
          {isMobile ? (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="p-0 w-64">
                <AppSidebar onNavigate={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
          ) : (
            <AppSidebar />
          )}
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar onMenuClick={isMobile ? () => setSidebarOpen(true) : undefined} />
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </PracticeFeaturesProvider>
    </PracticeBrandingProvider>
  );
}
