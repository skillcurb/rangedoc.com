/** SAVED PROVIDERS  ( /saved ) – list kept in the visitor's browser */
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { SavedList } from "@/components/site/SavedList";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("saved", { title: "Saved Providers" });
}

export default function SavedPage() {
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-extrabold">Saved Providers</h1>
      <p className="mt-1 mb-6 text-navy-700">Providers you saved on this device. Tip: press Ctrl/⌘ + D on a profile to add it to your browser bookmarks.</p>
      <SavedList />
    </div>
  );
}
