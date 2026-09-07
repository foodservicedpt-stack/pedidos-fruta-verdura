export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, optionalAuth } from '@/lib/api-helpers';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await optionalAuth();

  try {
    const body = await req.json();
    const { nombre, categoria, unidad, notas, ordenSeccion, mesInicioTemp, mesFinTemp, activo } = body ?? {};

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (unidad !== undefined) updateData.unidad = unidad;
    if (notas !== undefined) updateData.notas = notas || null;
    if (ordenSeccion !== undefined) updateData.ordenSeccion = ordenSeccion;
    if (mesInicioTemp !== undefined) updateData.mesInicioTemp = mesInicioTemp;
    if (mesFinTemp !== undefined) updateData.mesFinTemp = mesFinTemp;
    if (activo !== undefined) updateData.activo = activo;

    const id = parseIntId(params?.id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const producto = await prisma.producto.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(producto);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un producto con ese nombre en esa categoría' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await optionalAuth();

  try {
    const id = parseIntId(params?.id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    // Soft delete - just mark as inactive
    const producto = await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
    return NextResponse.json(producto);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
