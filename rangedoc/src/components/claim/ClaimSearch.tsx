"use client";
/**
 * "Find your profile" on the claim page.
 * Search by provider/practice name + city; results link to /register?provider=ID.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Loader2, MapPin, Search } from "lucide-react";
import { Autocomplete } from "@/components/site/Autocomplete";

type Result = { id: number; slug: string; name: string; city: string; claimStatus: string; typeLabel: string };

export function ClaimSearch() {
  const [name, setName] = useState("");
  const [loc, setLoc] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/claim-search?q=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`);
    setResults(await res.json());
    setLoading(false);
  }

  return (
    <div id="top">
      <form onSubmit={search} className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
        <div>
          <div className="relative">
            <Search className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-navy-700" />
            <input value={name} onChange={(e) => setName(e.target.value)} className="input h-12 pl-10" placeholder="Search by your name or practice name" required minLength={2} />
          </div>
          <p className="help">e.g. Sarah Kim, PT or Mountain View Physical Therapy</p>
        </div>
        <div>
          <Autocomplete
            kind="location"
            value={loc}
            onChange={(v) => {
              setLoc(v);
              setCity("");
            }}
            onSelect={(s) => {
              setLoc(s.label);
              setCity(s.slug ?? "");
            }}
            placeholder="City or ZIP"
            icon={<MapPin className="size-5" />}
            showOnFocus={false}
          />
          <p className="help">e.g. Denver, CO</p>
        </div>
        <button className="btn-primary h-12 px-6" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null} Search Profiles <ArrowRight className="size-4" />
        </button>
      </form>

      {results && (
        <div className="mt-4 divide-y divide-line rounded-xl border border-line">
          {results.length === 0 && <p className="p-4 text-sm text-muted">No matching profiles. You can create a new listing instead.</p>}
          {results.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/provider/${r.slug}`} className="font-semibold text-navy-900 hover:text-brand-700" target="_blank">
                  {r.name}
                </Link>
                <p className="text-sm text-muted">
                  {r.typeLabel} · {r.city}
                </p>
              </div>
              {r.claimStatus === "UNCLAIMED" ? (
                <Link href={`/register?provider=${r.id}`} className="btn-primary btn-sm">
                  Claim this profile
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-sm text-brand-700">
                  <BadgeCheck className="size-4" /> {r.claimStatus === "PENDING" ? "Claim pending" : "Already claimed"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
