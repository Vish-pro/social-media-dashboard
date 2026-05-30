import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

// GET /api/workspaces/[id]/members — list members of a workspace
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const resolvedParams = await params;
    const workspaceId = resolvedParams.id;

    // Verify caller is a member
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/members — invite a user by email
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const resolvedParams = await params;
    const workspaceId = resolvedParams.id;

    // Only ADMINs can invite
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden — only admins can invite" }, { status: 403 });
    }

    const { email, role = "CONTRIBUTOR" } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      return NextResponse.json(
        { error: "No account found with that email. They must sign in first." },
        { status: 404 }
      );
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    const newMember = await prisma.workspaceMember.create({
      data: { workspaceId, userId: invitee.id, role },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/members — remove a member by userId
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const callerId = (session.user as any).id;
    const resolvedParams = await params;
    const workspaceId = resolvedParams.id;
    const { userId: targetUserId } = await req.json();

    const callerMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: callerId } },
    });
    if (!callerMembership || callerMembership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (targetUserId === callerId) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}

