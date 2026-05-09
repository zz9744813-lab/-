"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children?: React.ReactNode;
  className?: string;
}

export function SubmitButton({ children = "保存", className = "" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`glass-btn glass-btn-primary !py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>提交中...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
