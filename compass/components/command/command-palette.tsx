"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";

const ITEMS = [
  ["总览", "/dashboard"],
  ["目标", "/goals"],
  ["习惯", "/habits"],
  ["日记", "/journal"],
  ["知识", "/knowledge"],
  ["财务", "/finance"],
  ["大脑", "/brain"],
  ["复盘", "/reviews"],
  ["收件箱", "/inbox"],
  ["设置", "/settings"],
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <Command className="mx-auto mt-24 w-full max-w-2xl rounded-lg border border-border bg-bg-elevated p-2">
        <Command.Input placeholder="输入命令或页面名..." className="mb-2 w-full bg-transparent p-3 outline-none" />
        <Command.List>
          <Command.Group heading="页面导航">
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
