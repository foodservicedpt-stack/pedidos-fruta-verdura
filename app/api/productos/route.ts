export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { optionalAuth } from '@/lib/api-helpers';

export async function GET() {
  const auth = await optionalAuth();

  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
    return NextResponse.json(productos ?? []);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await optionalAuth();

  try {
    const body = await req.json();
    const { nombre, categoria, unidad, notas, ordenSeccion, mesInicioTemp, mesFinTemp } = body ?? {};

    if (!nombre || !categoria || !unidad) {
      return NextResponse.json({ error: 'Nombre, categoría y unidad son obligatorios' }, { status: 400 });
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        categoria,
        unidad,
        notas: notas || null,
        ordenSeccion: ordenSeccion ?? 999,
        mesInicioTemp: mesInicioTemp ?? null,
        mesFinTemp: mesFinTemp ?? null,
        enTemporada: true,
        activo: true,
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un producto con ese nombre en esa categoría' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message ?? 'Error al crear producto' }, { status: 500 });
  }
}
