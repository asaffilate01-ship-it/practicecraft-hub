import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { DevBanner } from "@/components/DevBanner";
import { PracticeBrandingProvider } from "@/practice/branding/PracticeBrandingProvider";
import { PracticeFeaturesProvider } from "@/practice/features/PracticeFeaturesProvider";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MobileBottomNav } from "./MobileBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PracticeBrandingProvider>
      <PracticeFeaturesProvider>
        <div className="flex min-h-screen w-full bg-background">
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
            <DevBanner />
            <TopBar onMenuClick={isMobile ? () => setSidebarOpen(true) : undefined} />
            <main className="flex-1 overflow-auto px-3 pb-24 pt-4 sm:px-4 md:p-7">
              <div className="mx-auto w-full max-w-[1540px]">{children}</div>
            </main>
            {isMobile && <MobileBottomNav />}
          </div>
        </div>
      </PracticeFeaturesProvider>
    </PracticeBrandingProvider>
  );
}
