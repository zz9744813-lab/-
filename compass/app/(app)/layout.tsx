import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/command/command-palette";
import { QuickCapture } from "@/components/capture/quick-capture";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 overflow-x-hidden">
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>
      <CommandPalette />
      <QuickCapture />
    </div>
  );
}
