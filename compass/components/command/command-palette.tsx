"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";

const ITEMS = [
  ["Dashboard", "/dashboard"],
  ["Goals", "/goals"],
  ["Habits", "/habits"],
  ["Journal", "/journal"],
  ["Knowledge", "/knowledge"],
  ["Finance", "/finance"],
  ["Brain", "/brain"],
  ["Reviews", "/reviews"],
  ["Inbox", "/inbox"],
  ["Settings", "/settings"],
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <Command className="mx-auto mt-24 w-full max-w-2xl rounded-lg border border-border bg-bg-elevated p-2">
        <Command.Input placeholder="Type a command..." className="mb-2 w-full bg-transparent p-3 outline-none" />
        <Command.List>
          <Command.Group heading="Navigate">
            {ITEMS.map(([label, href]) => (
              <Command.Item
                key={href}
                onSelect={() => {
                  router.push(href);
                  setOpen(false);
                }}
                className="cursor-pointer rounded-md px-3 py-2 data-[selected=true]:bg-accent-muted"
              >
                {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
