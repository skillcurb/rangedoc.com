/**
 * POST /api/track – receives analytics events from the browser.
 * Body: { events: [{ type, providerId?, path?, meta? }], sessionId, referrer, geo }
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { EVENT_TYPES, recordEvents } from "@/lib/analytics";

const schema = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(EVENT_TYPES),
        providerId: z.number().int().positive().optional().nullable(),
        path: z.string().max(500).optional().nullable(),
        meta: z.record(z.string(), z.unknown()).optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
  sessionId: z.string().max(64).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  geo: z.object({ city: z.string().max(120).optional(), lat: z.number().optional(), lng: z.number().optional() }).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // sendBeacon posts a Blob, so read the raw text and parse it ourselves
    const parsed = schema.safeParse(JSON.parse(await request.text()));
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    const { events, sessionId, referrer, geo } = parsed.data;
    await recordEvents(events, {
      visitorId: request.cookies.get("rd_vid")?.value,
      sessionId,
      referrer,
      userAgent: request.headers.get("user-agent"),
      headers: request.headers,
      geo,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
