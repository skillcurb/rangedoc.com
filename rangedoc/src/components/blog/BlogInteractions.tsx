"use client";
/**
 * Blog post interactions: star rating (one per visitor) and comment form.
 */
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Stars, StarInput } from "@/components/ui/Stars";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { rateBlogPost, submitBlogComment } from "@/lib/actions/public";

export function BlogRating({ postId, avg, count }: { postId: number; avg: number; count: number }) {
  const [state, setState] = useState({ avg, count });
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-surface p-4">
      <div>
        <p className="text-sm font-semibold text-navy-900">Was this article helpful?</p>
        <p className="text-xs text-muted">Tap a star to rate</p>
      </div>
      <StarInput
        onChange={(v) =>
          start(async () => {
            const res = await rateBlogPost(postId, v);
            if (res.ok && res.avg != null) {
              setState({ avg: res.avg, count: res.count ?? state.count });
              toast.success("Thanks for rating!");
            } else toast.error(res.error ?? "Could not save rating");
          })
        }
      />
      <div className="ml-auto flex items-center gap-2 text-sm text-navy-800">
        <Stars value={state.avg} /> {state.count ? `${state.avg.toFixed(1)} (${state.count})` : "No ratings yet"}
        {pending && <span className="text-xs text-muted">saving…</span>}
      </div>
    </div>
  );
}

export function CommentForm({ postId }: { postId: number }) {
  const [state, action] = useActionState(submitBlogComment, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Thanks!");
      ref.current?.reset();
    } else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="postId" value={postId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Name *" className="input" />
        <input name="email" type="email" required placeholder="Email * (not published)" className="input" />
      </div>
      <textarea name="body" required rows={4} placeholder="Share your thoughts…" className="input" />
      <SubmitButton pendingText="Posting…">Post comment</SubmitButton>
    </form>
  );
}
