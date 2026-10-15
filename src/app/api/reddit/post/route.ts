import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, text, title } = body;

    if (!workspaceId || !text) {
      return NextResponse.json({ error: "workspaceId and text are required" }, { status: 400 });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "reddit" },
    });

    if (!account) {
      return NextResponse.json({ error: "Reddit connection not found in this workspace." }, { status: 400 });
    }

    const isMock = account.accessToken.startsWith("mock_") || account.accessToken === "PLACEHOLDER";

    if (isMock) {
      const mockPostId = "t3_mockredditpost123";
      return NextResponse.json({
        success: true,
        postId: mockPostId,
        url: `https://reddit.com/r/${account.accountId.split(":").pop()}/comments/mockpost`,
      });
    }

    // Live Reddit Publishing
    const token = account.accessToken;
    const subreddit = account.accountId.split(":").pop() as string; // accountId is "<redditUserId>:<subreddit>"
    const finalTitle = title?.trim() || "SocialPulse Post";

    const params = new URLSearchParams();
    params.append("sr", subreddit);
    params.append("title", finalTitle);
    params.append("kind", "self");
    params.append("text", text);

    const redditRes = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SocialPulseDashboard/1.0 by Vavvy",
      },
      body: params.toString(),
    });

    const redditData = await redditRes.json();

    if (!redditRes.ok) {
      throw new Error(redditData.error || redditData.message || "Reddit API rejected the post submission.");
    }

    // Response contains parsed details
    const parsedData = redditData.json?.data;
    const postId = parsedData?.id || "unknown";
    const postUrl = parsedData?.url || `https://reddit.com/r/${subreddit}/comments/${postId}`;

    return NextResponse.json({
      success: true,
      postId,
      url: postUrl,
    });
  } catch (error: any) {
    console.error("Reddit Publishing Error:", error);
    return NextResponse.json({ error: error.message || "Reddit publishing error" }, { status: 500 });
  }
}
