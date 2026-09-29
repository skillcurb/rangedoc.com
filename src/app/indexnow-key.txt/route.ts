/**
 * /indexnow-key.txt – proves to IndexNow (Bing, Yandex…) that this site owns
 * the key used to submit changed URLs.
 */
import { getIndexNowKey } from "@/lib/sitemap";

export async function GET() {
  return new Response(await getIndexNowKey(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
