import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/command/command-palette";
import { QuickCapture } from "@/components/capture/quick-capture";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen text-text-primary">
      <Sidebar />
      <main className="flex-1 p-10 overflow-x-hidden">
        <div className="mx-auto max-w-[1080px]">{children}</div>
      </main>
      <CommandPalette />
      <QuickCapture />
    </div>
  );
}
