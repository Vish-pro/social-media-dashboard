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
    const { workspaceId, accessToken, subreddit } = body;

    if (!workspaceId || !accessToken || !subreddit) {
      return NextResponse.json({ error: "workspaceId, accessToken, and subreddit are required" }, { status: 400 });
    }

    const isMock = accessToken.startsWith("mock_") || accessToken === "PLACEHOLDER";

    let accountName = `r/${subreddit} Subreddit Channel`;
    let username = subreddit;
    let accountId = `reddit_${subreddit}`;
    let imageUrl = "https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-57x57.png";

    if (!isMock) {
      try {
        // Live verify: test request to oauth.reddit.com to verify credentials
        const res = await fetch("https://oauth.reddit.com/api/v1/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "SocialPulseDashboard/1.0 by Vavvy",
          },
        });

        if (!res.ok) {
          throw new Error("Invalid Reddit Access Token or credentials expired.");
        }

        const data = await res.json();
        const redditUsername = data.name || subreddit;
        accountName = `r/${subreddit} (as u/${redditUsername})`;
        username = redditUsername;
        accountId = String(data.id || `reddit_${subreddit}`);
        imageUrl = data.icon_img || imageUrl;
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to verify Reddit credentials." }, { status: 400 });
      }
    }

    // Save Reddit account to SocialAccount
    // We store the subreddit name in username, and the accessToken is the Token + Subreddit name serialized or just Token.
    // To preserve the subreddit target, we can store it in the accountId or serialize it.
    // Let's store "subreddit_name:token" inside accessToken or keep them cleanly.
    // Even cleaner: we store the subreddit in the 'username' field, so when publishing we know exactly which subreddit to hit!
    const savedAccount = await prisma.socialAccount.upsert({
      where: {
        platform_accountId: {
          platform: "reddit",
          accountId: accountId,
        },
      },
      update: {
        workspaceId,
        accessToken: accessToken,
        accountName,
        username: subreddit, // The target subreddit
        image: imageUrl,
      },
      create: {
        workspaceId,
        platform: "reddit",
        accountId: accountId,
        accessToken: accessToken,
        accountName,
        username: subreddit,
        image: imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: savedAccount.id,
        accountName,
        username: subreddit,
        platform: "reddit",
      },
    });
  } catch (error: any) {
    console.error("Reddit Connect Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
