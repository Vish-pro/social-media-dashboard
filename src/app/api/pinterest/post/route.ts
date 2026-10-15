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
    const { workspaceId, text, title, mediaUrls } = body;

    if (!workspaceId || !text) {
      return NextResponse.json({ error: "workspaceId and text are required" }, { status: 400 });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "pinterest" },
    });

    if (!account) {
      return NextResponse.json({ error: "Pinterest connection not found in this workspace." }, { status: 400 });
    }

    const mediaUrl = mediaUrls?.[0];
    if (!mediaUrl) {
      return NextResponse.json({ error: "Pinterest strictly requires an image attachment to create a Pin." }, { status: 400 });
    }

    const isMock = account.accessToken.startsWith("mock_") || account.accessToken === "PLACEHOLDER";

    if (isMock) {
      const mockPinId = "98712398471298412";
      return NextResponse.json({
        success: true,
        postId: mockPinId,
        url: `https://pinterest.com/pin/${mockPinId}`,
      });
    }

    // Live Pinterest Pin Publishing
    const token = account.accessToken;
    const boardId = account.accountId.replace(/^pinterest_/, ""); // accountId holds the target board ID
    const finalTitle = title?.trim() || "SocialPulse Pin";

    // Public absolute URL requirement for Pinterest downloads
    // If it's a relative local URL, we build an absolute one or use the relative path
    const absoluteMediaUrl = mediaUrl.startsWith("http") 
      ? mediaUrl 
      : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${mediaUrl}`;

    const pinterestRes = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        title: finalTitle,
        description: text,
        media_source: {
          source_type: "image_url",
          url: absoluteMediaUrl,
        },
      }),
    });

    const pinterestData = await pinterestRes.json();

    if (!pinterestRes.ok) {
      throw new Error(pinterestData.message || "Pinterest API rejected Pin creation.");
    }

    return NextResponse.json({
      success: true,
      postId: pinterestData.id,
      url: `https://pinterest.com/pin/${pinterestData.id}`,
    });
  } catch (error: any) {
    console.error("Pinterest Publishing Error:", error);
    return NextResponse.json({ error: error.message || "Pinterest publishing error" }, { status: 500 });
  }
}
