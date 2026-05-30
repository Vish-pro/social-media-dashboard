import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    const channels = await prisma.socialAccount.findMany({
      where: { workspaceId },
      select: {
        id: true,
        platform: true,
        accountName: true,
        image: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const platform = searchParams.get("platform");

    if (!workspaceId || !platform) {
      return NextResponse.json({ error: "Workspace ID and platform are required" }, { status: 400 });
    }

    await prisma.socialAccount.deleteMany({
      where: { workspaceId, platform },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting channel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

