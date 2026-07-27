import { NextResponse } from "next/server";
import { normalizeAIText, normalizeErrorMessage } from "@/lib/ai/util";
import { describeWorkspaceScreenshot } from "@/lib/ai/providers/openrouter_v2";
import { createClient } from "@/lib/supabase/server";

const maxScreenshotBase64Length = 4_500_000;

function parseDataUrlImage(value: unknown) {
  const dataUrl = normalizeAIText(value);
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { mimeType: match[1], imageBase64: match[2] };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to use screen-aware chat." }, { status: 401 });
    }

    const { input } = await req.json();
    const question = normalizeAIText(input?.question);
    const parsedImage = parseDataUrlImage(input?.imageDataUrl);

    if (!question) {
      return NextResponse.json({ error: "No screen-context question was provided." }, { status: 400 });
    }

    if (!parsedImage) {
      return NextResponse.json({ error: "A PNG, JPEG, or WebP data URL screenshot is required." }, { status: 400 });
    }

    if (parsedImage.imageBase64.length > maxScreenshotBase64Length) {
      return NextResponse.json({ error: "The workspace screenshot is too large to analyze." }, { status: 413 });
    }

    const description = await describeWorkspaceScreenshot({
      question,
      imageBase64: parsedImage.imageBase64,
      mimeType: parsedImage.mimeType
    });

    return NextResponse.json({ description });
  } catch (error) {
    return NextResponse.json(
      { error: normalizeErrorMessage(error, "Unable to describe the current screen.") },
      { status: 400 }
    );
  }
}
