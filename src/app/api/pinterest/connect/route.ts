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
    const { workspaceId, accessToken, boardId } = body;

    if (!workspaceId || !accessToken || !boardId) {
      return NextResponse.json({ error: "workspaceId, accessToken, and boardId are required" }, { status: 400 });
    }

    const isMock = accessToken.startsWith("mock_") || accessToken === "PLACEHOLDER";

    let accountName = `Pinterest Board: ${boardId}`;
    let accountId = `pinterest_${boardId}`;
    let imageUrl = "https://v1.pinterest.com/favicon.ico";

    if (!isMock) {
      try {
        // Live verify board info
        const res = await fetch(`https://api.pinterest.com/v5/boards/${boardId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Invalid Pinterest Board ID or access token.");
        }

        const data = await res.json();
        accountName = `Pinterest: ${data.name || boardId}`;
        accountId = String(data.id || `pinterest_${boardId}`);
        imageUrl = data.owner?.image || imageUrl;
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to verify Pinterest credentials." }, { status: 400 });
      }
    }

    // Save Pinterest account to SocialAccount
    const savedAccount = await prisma.socialAccount.upsert({
      where: {
        platform_accountId: {
          platform: "pinterest",
          accountId: accountId,
        },
      },
      update: {
        workspaceId,
        accessToken: accessToken,
        accountName,
        image: imageUrl,
      },
      create: {
        workspaceId,
        platform: "pinterest",
        accountId: accountId,
        accessToken: accessToken,
        accountName,
        image: imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: savedAccount.id,
        accountName,
        username: boardId,
        platform: "pinterest",
      },
    });
  } catch (error: any) {
    console.error("Pinterest Connect Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
