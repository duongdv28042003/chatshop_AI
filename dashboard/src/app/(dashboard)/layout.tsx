import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { FloatingAIAssistant } from "@/components/ai-widget/floating-ai-assistant";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 flex-1 flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 shrink-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
          </div>
          <ThemeToggle />
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 p-3 sm:p-5 md:p-6 min-w-0 overflow-x-hidden flex flex-col text-neutral-900 dark:text-neutral-100">{children}</main>

        {}
        <FloatingAIAssistant />
      </SidebarInset>
    </SidebarProvider>
  );
}
