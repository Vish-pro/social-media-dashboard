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
    const { workspaceId, apiKey } = body;

    if (!workspaceId || !apiKey) {
      return NextResponse.json({ error: "workspaceId and apiKey are required" }, { status: 400 });
    }

    const isMock = apiKey.startsWith("mock_") || apiKey === "PLACEHOLDER";

    let accountName = "Vavvy Dev DEV.to Account";
    let username = "vavvy_dev";
    let accountId = "mock_devto_user_123";
    let imageUrl = "https://dev-to-uploads.s3.amazonaws.com/uploads/user/profile_image/default.png";

    if (!isMock) {
      try {
        const res = await fetch("https://dev.to/api/users/me", {
          method: "GET",
          headers: {
            "api-key": apiKey,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Invalid DEV.to API key or token expired.");
        }

        const data = await res.json();
        accountName = data.name || data.username || "DEV.to User";
        username = data.username || "devto_user";
        accountId = String(data.id || "devto_id");
        imageUrl = data.profile_image || imageUrl;
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to verify DEV.to API key." }, { status: 400 });
      }
    }

    // Save DEV.to account to SocialAccount
    const savedAccount = await prisma.socialAccount.upsert({
      where: {
        platform_accountId: {
          platform: "devto",
          accountId: accountId,
        },
      },
      update: {
        workspaceId,
        accessToken: apiKey,
        accountName,
        username,
        image: imageUrl,
      },
      create: {
        workspaceId,
        platform: "devto",
        accountId: accountId,
        accessToken: apiKey,
        accountName,
        username,
        image: imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: savedAccount.id,
        accountName,
        username,
        platform: "devto",
      },
    });
  } catch (error: any) {
    console.error("DEV.to Connect Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
