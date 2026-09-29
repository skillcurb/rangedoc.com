"use client";
/**
 * "Call" button – the phone number stays hidden until clicked.
 * First click: fetch the number (records CALL_CLICK) and show it.
 * Second click: opens the phone dialer (tel: link).
 */
import { useState } from "react";
import { Loader2, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export function RevealPhoneButton({ providerId, className, label = "Call", from }: { providerId: number; className?: string; label?: string; from?: string }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (phone) {
    return (
      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={cn("btn-outline", className)}>
        <Phone className="size-4" /> {phone}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cn("btn-outline", className)}
      disabled={loading}
      onClick={async (e) => {
        e.stopPropagation();
        setLoading(true);
        try {
          const res = await fetch(`/api/providers/${providerId}/contact?from=${encodeURIComponent(from ?? location.pathname)}`);
          const data = await res.json();
          if (data.phone) setPhone(data.phone);
          else toast.error("Phone number not available");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />} {label}
    </button>
  );
}
