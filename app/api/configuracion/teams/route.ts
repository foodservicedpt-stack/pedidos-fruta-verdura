export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-helpers';

export async function GET() {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const config = await prisma.configuracionTeams.findFirst();
    return NextResponse.json(config ?? { webhookUrl: '', activo: false });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ('response' in auth) return auth.response;

  try {
    const { webhookUrl, activo } = await req.json();
    const existing = await prisma.configuracionTeams.findFirst();

    if (existing) {
      const updated = await prisma.configuracionTeams.update({
        where: { id: existing.id },
        data: { webhookUrl: webhookUrl ?? '', activo: activo ?? true },
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.configuracionTeams.create({
        data: { webhookUrl: webhookUrl ?? '', activo: activo ?? true },
      });
      return NextResponse.json(created);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
