import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

async function requireAdmin(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return membership?.role === "ADMIN" ? membership : null;
}

// PATCH /api/workspaces/[id] — rename workspace
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const { id: workspaceId } = params;
    const admin = await requireAdmin(workspaceId, userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ workspace });
  } catch {
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id] — delete workspace
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const { id: workspaceId } = params;
    const admin = await requireAdmin(workspaceId, userId);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.workspace.delete({ where: { id: workspaceId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
  }
}
