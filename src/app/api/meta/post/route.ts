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
    const { workspaceId, platform, text, title, mediaUrls } = body;

    if (!workspaceId || !platform || !text) {
      return NextResponse.json({ error: "workspaceId, platform, and text are required" }, { status: 400 });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform },
    });

    if (!account) {
      return NextResponse.json({ error: `${platform} connection not found in this workspace.` }, { status: 400 });
    }

    const isMock = account.accessToken.startsWith("mock_");

    if (isMock) {
      // Simulate live posting response
      const mockPostIds: Record<string, string> = {
        facebook: "1209384729384712",
        instagram: "17928347293847129",
        threads: "829384729384712",
      };
      const mockUrls: Record<string, string> = {
        facebook: `https://facebook.com/${account.accountId}/posts/${mockPostIds.facebook}`,
        instagram: `https://instagram.com/p/C_mockPostIdig/`,
        threads: `https://threads.net/@${account.username}/post/${mockPostIds.threads}`,
      };

      return NextResponse.json({
        success: true,
        postId: mockPostIds[platform] || "mock_id",
        url: mockUrls[platform] || "https://meta.com",
      });
    }

    // Live Meta Graph API publishing
    const token = account.accessToken;
    const accountId = account.accountId;

    if (platform === "facebook") {
      let fbRes;
      const mediaUrl = mediaUrls?.[0];

      if (mediaUrl) {
        // Upload photo/media to Page feed
        fbRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: mediaUrl,
            caption: text,
            access_token: token,
          }),
        });
      } else {
        // Text feed post
        fbRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            access_token: token,
          }),
        });
      }

      const fbData = await fbRes.json();
      if (fbData.error) {
        throw new Error(fbData.error.message || "Facebook Graph API rejected the feed post.");
      }

      return NextResponse.json({
        success: true,
        postId: fbData.id || fbData.post_id,
        url: `https://facebook.com/${fbData.id || fbData.post_id}`,
      });
    }

    if (platform === "instagram") {
      const mediaUrl = mediaUrls?.[0];
      if (!mediaUrl) {
        throw new Error("Instagram content publishing requires a publicly accessible image or video URL.");
      }

      // 1. Create Instagram Media Container
      const containerRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption: text,
          access_token: token,
        }),
      });
      const containerData = await containerRes.json();
      if (containerData.error) {
        throw new Error(containerData.error.message || "Instagram media container creation failed.");
      }

      const creationId = containerData.id;

      // In production, we'd poll or wait for processing, here we wait 5 seconds as best practice then publish
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 2. Publish Instagram Media Container
      const publishRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token,
        }),
      });
      const publishData = await publishRes.json();
      if (publishData.error) {
        throw new Error(publishData.error.message || "Instagram media publishing transaction failed.");
      }

      return NextResponse.json({
        success: true,
        postId: publishData.id,
        url: `https://instagram.com/p/${publishData.id}/`,
      });
    }

    if (platform === "threads") {
      const mediaUrl = mediaUrls?.[0];
      const params: any = {
        text,
        access_token: token,
      };

      if (mediaUrl) {
        params.media_type = "IMAGE";
        params.image_url = mediaUrl;
      }

      // 1. Create Threads Media Container
      const containerRes = await fetch(`https://graph.threads.net/v1.0/${accountId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const containerData = await containerRes.json();
      if (containerData.error) {
        throw new Error(containerData.error.message || "Threads container creation failed.");
      }

      const creationId = containerData.id;

      // Wait 5 seconds for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 2. Publish Threads Container
      const publishRes = await fetch(`https://graph.threads.net/v1.0/${accountId}/threads_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token,
        }),
      });
      const publishData = await publishRes.json();
      if (publishData.error) {
        throw new Error(publishData.error.message || "Threads container publish failed.");
      }

      return NextResponse.json({
        success: true,
        postId: publishData.id,
        url: `https://threads.net/@${account.username}/post/${publishData.id}`,
      });
    }

    return NextResponse.json({ error: "Unsupported platform." }, { status: 400 });
  } catch (error) {
    console.error("Meta Graph API Post Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Meta publishing graph error" }, { status: 500 });
  }
}
