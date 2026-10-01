/** 404 page for the public site */
import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <SearchX className="size-16 text-navy-300" />
      <h1 className="mt-4 text-4xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-navy-700">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary">Go home</Link>
        <Link href="/search" className="btn-light">Find care</Link>
      </div>
    </div>
  );
}
