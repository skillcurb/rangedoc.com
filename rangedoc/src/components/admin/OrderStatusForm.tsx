"use client";
/** Change a product order's status (optionally emailing the customer). */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateOrderStatus } from "@/lib/admin/actions";

const STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED"];

export function OrderStatusForm({ id, status }: { id: number; status: string }) {
  const [value, setValue] = useState(status);
  const [notify, setNotify] = useState(true);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-3">
      <select value={value} onChange={(e) => setValue(e.target.value)} className="input" aria-label="Order status">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer</label>
      <button
        type="button"
        disabled={pending || value === status}
        className="btn-primary w-full"
        onClick={() => start(async () => {
          const res = await updateOrderStatus(id, value, notify);
          if (res?.error) toast.error(res.error); else toast.success("Order updated");
          router.refresh();
        })}
      >
        Update status
      </button>
    </div>
  );
}
