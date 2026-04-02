import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    const messages = input.history?.length
      ? input.history
      : input.messages || [{ role: "user", content: input.message || input.prompt || "" }];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-8b-instruct:free",
        messages,
        temperature: 0.4,
        max_tokens: 1200,
        stream: true
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return new NextResponse(text, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
