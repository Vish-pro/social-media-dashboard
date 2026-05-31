import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { workspaceId, text, thread } = await req.json();

    if (!workspaceId || (!text && (!thread || thread.length === 0))) {
      return NextResponse.json({ error: "Missing workspaceId or text" }, { status: 400 });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "x" },
    });

    if (!account || !account.accessToken) {
      return NextResponse.json({ error: "No connected X.com account found." }, { status: 404 });
    }

    const threadTweets = thread && thread.length > 0 ? thread : [text];
    let lastTweetId = null;
    const tweetsPosted = [];

    for (const tweet of threadTweets) {
      if (!tweet.trim()) continue;

      const payload: any = { text: tweet.slice(0, 280) };
      if (lastTweetId) {
        payload.reply = { in_reply_to_tweet_id: lastTweetId };
      }

      const postRes = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        console.error("X.com thread step error:", errText);
        return NextResponse.json({ error: `Tweet failed: ${errText}` }, { status: postRes.status });
      }

      const data = await postRes.json();
      lastTweetId = data.data?.id;
      tweetsPosted.push(data.data);
    }

    return NextResponse.json({ success: true, tweets: tweetsPosted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to post tweet" }, { status: 500 });
  }
}
