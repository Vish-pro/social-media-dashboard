import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/linkedin/post
 * Body: { accessToken: string; text: string; authorUrn?: string }
 *
 * Creates a text post on LinkedIn using the user's OAuth access token.
 * Uses the new /rest/posts endpoint (LinkedIn-Version: 202406+)
 *
 * Scopes required: w_member_social
 * The accessToken comes from /api/linkedin/callback flow.
 */
export async function POST(req: NextRequest) {
  try {
    const { accessToken, text, authorUrn } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: "LinkedIn access token is required." }, { status: 400 });
    }
    if (!text?.trim()) {
      return NextResponse.json({ error: "Post text cannot be empty." }, { status: 400 });
    }

    // If no authorUrn provided, fetch it from the token
    let urn = authorUrn;
    if (!urn) {
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!meRes.ok) {
        return NextResponse.json({ error: "Could not fetch LinkedIn profile." }, { status: 401 });
      }
      const me = await meRes.json();
      urn = `urn:li:person:${me.sub}`;
    }

    // Create a text post via the new REST API
    const postRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202406",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: urn,
        commentary: text.trim(),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      console.error("[LinkedIn post error]", postRes.status, errText);
      return NextResponse.json(
        { error: `LinkedIn API error: ${postRes.status}` },
        { status: postRes.status }
      );
    }

    // LinkedIn returns 201 with the post URN in the header
    const postUrn = postRes.headers.get("x-linkedin-id") ?? postRes.headers.get("location");

    return NextResponse.json({
      success: true,
      platform: "linkedin",
      postUrn,
    });
  } catch (err: any) {
    console.error("[LinkedIn post error]", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to post to LinkedIn." },
      { status: 500 }
    );
  }
}
