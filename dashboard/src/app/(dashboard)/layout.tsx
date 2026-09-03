import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { FloatingAIAssistant } from "@/components/ai-widget/floating-ai-assistant";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex-1" />
        </header>

        {}
        <main className="flex-1 p-6">{children}</main>

        {}
        <FloatingAIAssistant />
      </SidebarInset>
    </SidebarProvider>
  );
}
