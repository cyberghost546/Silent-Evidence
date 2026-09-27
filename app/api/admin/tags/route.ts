// DELETE /api/admin/tags — delete a tag by id
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const adminId = Number(cookieStore.get('userId')?.value ?? 0);
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!admin || admin.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  const tag = await prisma.tag.findUnique({ where: { id }, select: { name: true } });
  await prisma.tag.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      adminId,
      action: 'DELETE_TAG',
      targetId: id,
      targetType: 'Tag',
      detail: `Deleted tag: ${tag?.name}`,
    },
  });
  return NextResponse.json({ ok: true });
}
