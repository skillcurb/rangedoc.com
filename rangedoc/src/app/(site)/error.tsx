"use client";
/** Friendly error boundary for public pages */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-3xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 text-navy-700">Please try again in a moment.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
