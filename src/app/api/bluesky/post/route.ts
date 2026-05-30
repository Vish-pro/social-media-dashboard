import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/bluesky/post
 * Body: { identifier: string; appPassword: string; text: string; workspaceId: string }
 *
 * Uses the @atproto/api SDK to authenticate with Bluesky and create a post.
 * No OAuth setup required — just a Bluesky handle + App Password from:
 *   Settings → Privacy and Security → App Passwords
 */
export async function POST(req: NextRequest) {
  try {
    const { identifier, appPassword, text } = await req.json();

    if (!identifier || !appPassword) {
      return NextResponse.json(
        { error: "Bluesky handle and App Password are required." },
        { status: 400 }
      );
    }
    if (!text?.trim()) {
      return NextResponse.json({ error: "Post text cannot be empty." }, { status: 400 });
    }
    if (text.length > 300) {
      return NextResponse.json(
        { error: "Bluesky posts are limited to 300 characters." },
        { status: 400 }
      );
    }

    // Dynamically import to avoid SSR issues
    const { BskyAgent } = await import("@atproto/api");
    const agent = new BskyAgent({ service: "https://bsky.social" });

    await agent.login({ identifier, password: appPassword });

    const response = await agent.post({
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      uri: response.uri,
      cid: response.cid,
      platform: "bluesky",
    });
  } catch (err: any) {
    console.error("[Bluesky post error]", err);
    const message =
      err?.message?.includes("Invalid identifier or password")
        ? "Invalid Bluesky handle or App Password. Check your credentials."
        : err?.message ?? "Failed to post to Bluesky.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
