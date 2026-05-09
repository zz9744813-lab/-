"use client";

import { useRef, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";

interface FormWithToastProps {
  action: (formData: FormData) => Promise<any>;
  successMessage?: string;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}

export function FormWithToast({
  action,
  successMessage = "保存成功",
  children,
  className = "",
  resetOnSuccess = true,
}: FormWithToastProps) {
  const { success, error } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    try {
      await action(formData);
      success(successMessage);
      if (resetOnSuccess && formRef.current) {
        formRef.current.reset();
      }
    } catch (e: any) {
      error(e?.message || "操作失败，请重试");
    }
  }

  return (
    <form ref={formRef} action={handleAction} className={className}>
      {children}
    </form>
  );
}
