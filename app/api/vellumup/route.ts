import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeText, sanitizeTextNullable, verifyVellumUpSignature } from "@/lib/vellumup/signature";

export async function POST(req: Request) {
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return new Response(null, { status: 400 });
  }

  const signatureHeader = req.headers.get("x-vellumup-signature") || req.headers.get("X-VellumUp-Signature");
  const secret = process.env.WEBHOOK_SECRET;

  const verification = verifyVellumUpSignature(rawBody, signatureHeader, secret);
  if (!verification.valid) {
    console.warn(`[VellumUp Webhook] Verification failed: ${verification.reason}`);
    return new Response(null, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const event = payload.event || payload.type || "article.published";
    const data = payload.data || payload;

    const slug = sanitizeText(data.slug);
    if (!slug) {
      console.warn("[VellumUp Webhook] Missing article slug in payload data.");
      return NextResponse.json({ success: true, message: "Missing article slug, ignored" });
    }

    const languageCode = sanitizeText(data.language_code || "en") || "en";
    const supabase = createAdminClient();

    if (event === "article.unpublished") {
      const { error } = await supabase
        .from("articles")
        .update({
          status: "draft",
          updated_at: new Date().toISOString()
        })
        .eq("slug", slug)
        .eq("language_code", languageCode);

      if (error) {
        console.error("[VellumUp Webhook] Error setting article to draft:", error);
      }
    } else {
      // article.published, article.updated, article.translated
      const coverImage = sanitizeTextNullable(data.cover_image || data.cover_image_url || null);
      const articleRow = {
        slug,
        language_code: languageCode,
        language_name: sanitizeTextNullable(data.language_name || null),
        title: sanitizeText(data.title || "Untitled Article"),
        content: sanitizeText(data.content || ""),
        cover_image: coverImage,
        meta_description: sanitizeTextNullable(data.meta_description || null),
        focus_keyword: sanitizeTextNullable(data.focus_keyword || null),
        secondary_keywords: Array.isArray(data.secondary_keywords) ? data.secondary_keywords : [],
        key_takeaways: Array.isArray(data.key_takeaways) ? data.key_takeaways : [],
        word_count: typeof data.word_count === "number" ? data.word_count : 0,
        reading_time_minutes: typeof data.reading_time_minutes === "number" ? data.reading_time_minutes : 0,
        internal_link_slugs: Array.isArray(data.internal_link_slugs) ? data.internal_link_slugs : [],
        website_domain: sanitizeTextNullable(data.website_domain || null),
        og_title: sanitizeTextNullable(data.og_title || data.title || null),
        og_description: sanitizeTextNullable(data.og_description || data.meta_description || null),
        status: data.status === "draft" ? "draft" : "published",
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString()
      };

      const { error } = await supabase
        .from("articles")
        .upsert(articleRow, { onConflict: "slug,language_code" });

      if (error) {
        console.error("[VellumUp Webhook] Upsert error:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[VellumUp Webhook] Processing error:", err);
    return NextResponse.json({ success: true, message: "Error handled" });
  }
}
