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
    const { workspaceId, text, title, tags } = body;

    if (!workspaceId || !text) {
      return NextResponse.json({ error: "workspaceId and text are required" }, { status: 400 });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "devto" },
    });

    if (!account) {
      return NextResponse.json({ error: "DEV.to connection not found in this workspace." }, { status: 400 });
    }

    const isMock = account.accessToken.startsWith("mock_") || account.accessToken === "PLACEHOLDER";

    if (isMock) {
      const mockPostId = 987654;
      return NextResponse.json({
        success: true,
        postId: String(mockPostId),
        url: `https://dev.to/${account.username}/mock-article-${mockPostId}`,
      });
    }

    // Live DEV.to Forem API Publishing
    const token = account.accessToken;
    const finalTitle = title?.trim() || "SocialPulse Post";
    const postTags = Array.isArray(tags) ? tags : [];

    const devtoRes = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": token,
      },
      body: JSON.stringify({
        article: {
          title: finalTitle,
          body_markdown: text,
          published: true,
          tags: postTags.slice(0, 4), // DEV.to allows max 4 tags
        },
      }),
    });

    const devtoData = await devtoRes.json();

    if (!devtoRes.ok) {
      throw new Error(devtoData.error || devtoData.message || "DEV.to API rejected the article submission.");
    }

    return NextResponse.json({
      success: true,
      postId: String(devtoData.id),
      url: devtoData.url || `https://dev.to/${account.username}/${devtoData.slug}`,
    });
  } catch (error: any) {
    console.error("DEV.to Publishing Error:", error);
    return NextResponse.json({ error: error.message || "DEV.to publishing error" }, { status: 500 });
  }
}
