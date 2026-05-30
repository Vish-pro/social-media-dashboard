import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/medium/post
 * Body: { integrationToken: string; title: string; content: string; tags?: string[]; status?: "public"|"draft" }
 *
 * Publishes a long-form article to Medium using a personal Integration Token.
 *
 * How to get your Medium Integration Token (takes 30 seconds):
 *   1. Log in to Medium → Click your avatar → Settings
 *   2. Go to Security and apps → Integration tokens
 *   3. Create a new token with a description (e.g. "SocialPulse Dashboard")
 *   4. Copy the token → paste into the Connections tab in Settings
 *
 * Content can be Markdown or HTML (set contentFormat accordingly).
 */
export async function POST(req: NextRequest) {
  try {
    const {
      integrationToken,
      title,
      content,
      tags = [],
      status = "public",
      contentFormat = "markdown",
    } = await req.json();

    if (!integrationToken) {
      return NextResponse.json(
        { error: "Medium Integration Token is required." },
        { status: 400 }
      );
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "A title is required for Medium posts." }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: "Post content cannot be empty." }, { status: 400 });
    }

    // Step 1: Get the authenticated user's ID
    const meRes = await fetch("https://api.medium.com/v1/me", {
      headers: {
        Authorization: `Bearer ${integrationToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!meRes.ok) {
      return NextResponse.json(
        { error: "Invalid Medium Integration Token or API error." },
        { status: 401 }
      );
    }

    const { data: me } = await meRes.json();

    // Step 2: Create the post
    const postRes = await fetch(`https://api.medium.com/v1/users/${me.id}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integrationToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title: title.trim(),
        contentFormat,
        content: content.trim(),
        tags: tags.slice(0, 5), // Medium allows max 5 tags
        publishStatus: status, // "public", "draft", or "unlisted"
      }),
    });

    if (!postRes.ok) {
      const errBody = await postRes.json().catch(() => ({}));
      console.error("[Medium post error]", postRes.status, errBody);
      return NextResponse.json(
        { error: errBody?.errors?.[0]?.message ?? `Medium API error: ${postRes.status}` },
        { status: postRes.status }
      );
    }

    const { data: post } = await postRes.json();

    return NextResponse.json({
      success: true,
      platform: "medium",
      postId: post.id,
      url: post.url,
      title: post.title,
    });
  } catch (err: any) {
    console.error("[Medium post error]", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to publish to Medium." },
      { status: 500 }
    );
  }
}
