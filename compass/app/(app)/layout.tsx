import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/command/command-palette";
import { QuickCapture } from "@/components/capture/quick-capture";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      <Sidebar />
      <main className="w-full max-w-[1040px] p-8">
        {children}
      </main>
      <CommandPalette />
      <QuickCapture />
    </div>
  );
}
