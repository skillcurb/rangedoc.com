"use client";
/**
 * Accessible modal dialog.
 * - Rendered in a portal on <body>, so it always sits above sticky headers
 *   and cards (which create their own stacking contexts)
 * - Closes with ESC or a click on the dark backdrop
 * - Locks page scroll while open
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
};

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", full: "max-w-6xl" };

export function Modal({ open, onClose, title, description, children, size = "md", className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="animate-fade-in absolute inset-0 bg-navy-950/60 backdrop-blur-[3px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn("animate-slide-up sm:animate-pop-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop outline-none sm:rounded-2xl", SIZES[size], className)}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              {title && <h2 className="text-lg font-bold text-navy-900">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface hover:text-navy-900" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
        )}
        {!title && !description && (
          <button type="button" onClick={onClose} className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-1.5 text-navy-900 shadow hover:bg-white" aria-label="Close">
            <X className="size-5" />
          </button>
        )}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
