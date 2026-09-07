export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { TIPO_PEDIDO_LABELS } from '@/lib/constants';
import { parseIntId, optionalAuth } from '@/lib/api-helpers';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await optionalAuth();

  const id = parseIntId(params?.id);
  if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        detalles: {
          include: { producto: true },
          orderBy: { producto: { nombre: 'asc' } },
        },
      },
    });

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const tipoLabel = TIPO_PEDIDO_LABELS;
    const estadoLabel: Record<string, string> = { borrador: 'Borrador', enviado: 'Enviado', recibido: 'Recibido' };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pedidos Fruta y Verdura';
    const sheet = workbook.addWorksheet('Pedido');

    // Title
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Pedido #${pedido.id} - Fruta y Verdura`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF2E7D32' } };
    titleCell.alignment = { horizontal: 'left' };

    // Info rows
    const infoStart = 3;
    const infoData = [
      ['Estado', estadoLabel[pedido.estado] ?? pedido.estado],
      ['Fecha pedido', new Date(pedido.fechaPedido).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
      ...(pedido.fechaEntrega ? [['Fecha entrega', new Date(pedido.fechaEntrega).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })]] : []),
      ...(pedido.tipoPedido ? [['Tipo', tipoLabel[pedido.tipoPedido] ?? pedido.tipoPedido]] : []),
      ['Creado por', pedido.user?.name ?? 'Usuario'],
      ...(pedido.notas ? [['Notas', pedido.notas]] : []),
    ];

    infoData.forEach((row, i) => {
      const r = sheet.getRow(infoStart + i);
      r.getCell(1).value = row[0];
      r.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF666666' } };
      r.getCell(2).value = row[1];
      r.getCell(2).font = { size: 11 };
    });

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const d of (pedido.detalles ?? [])) {
      const cat = d.producto?.categoria ?? 'Otros';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(d);
    }

    const catColors: Record<string, string> = { Verduras: 'FF4CAF50', Frutas: 'FFFF9800', Ensaladas: 'FF2196F3' };
    const isRecibido = pedido.estado === 'recibido';

    let currentRow = infoStart + infoData.length + 2;

    for (const [cat, items] of Object.entries(byCategory)) {
      // Category header
      const catRow = sheet.getRow(currentRow);
      sheet.mergeCells(`A${currentRow}:${isRecibido ? 'F' : 'E'}${currentRow}`);
      catRow.getCell(1).value = `${cat} (${items.length})`;
      catRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      catRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColors[cat] ?? 'FF666666' } };
      catRow.getCell(1).alignment = { horizontal: 'left' };
      currentRow++;

      // Headers
      const headers = ['Producto', 'Cantidad', 'Unidad', ...(isRecibido ? ['Recibido'] : []), 'Notas'];
      const headerRow = sheet.getRow(currentRow);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 10, color: { argb: 'FF666666' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
      });
      currentRow++;

      // Data rows
      for (const d of items) {
        const row = sheet.getRow(currentRow);
        row.getCell(1).value = d.producto?.nombre ?? 'Producto';
        row.getCell(2).value = d.cantidadSolicitada ?? 0;
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(2).font = { bold: true };
        row.getCell(3).value = d.producto?.unidad ?? '';
        row.getCell(3).alignment = { horizontal: 'center' };
        let colIdx = 4;
        if (isRecibido) {
          const sol = d.cantidadSolicitada ?? 0;
          const rec = d.cantidadRecibida;
          const hasDiff = rec !== null && rec !== undefined && rec !== sol;
          if (hasDiff) {
            const delta = rec - sol;
            const arrow = delta > 0 ? `▲ +${delta}` : `▼ ${delta}`;
            row.getCell(colIdx).value = `${rec} (${arrow})`;
            row.getCell(colIdx).font = { bold: true, color: { argb: delta > 0 ? 'FF2E7D32' : 'FFC62828' } };
          } else {
            row.getCell(colIdx).value = rec ?? '-';
          }
          row.getCell(colIdx).alignment = { horizontal: 'center' };
          colIdx++;
        }
        row.getCell(colIdx).value = d.comentario ?? '';
        row.getCell(colIdx).font = { size: 10, color: { argb: 'FF999999' } };
        currentRow++;
      }
      currentRow++; // gap between categories
    }

    // Extras/unknowns/noLlegaron section
    const extData = pedido.extrasAlbaran as any;
    if (extData) {
      const extras = extData?.extras ?? [];
      const noReg = extData?.noRegistrados ?? [];
      const noLlegaron = extData?.noLlegaron ?? [];
      if (extras.length > 0 || noReg.length > 0 || noLlegaron.length > 0) {
        currentRow++;
        const warnHeader = sheet.getRow(currentRow);
        sheet.mergeCells(`A${currentRow}:${isRecibido ? 'F' : 'E'}${currentRow}`);
        warnHeader.getCell(1).value = '⚠️ Incidencias del albarán';
        warnHeader.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF92400E' } };
        warnHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        currentRow++;

        if (noLlegaron.length > 0) {
          const nlLabel = sheet.getRow(currentRow);
          nlLabel.getCell(1).value = 'NO DETECTADOS EN ALBARANES (NO LLEGARON)';
          nlLabel.getCell(1).font = { bold: true, size: 9, color: { argb: 'FFDC2626' } };
          currentRow++;
          for (const nl of noLlegaron) {
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = nl.nombre;
            row.getCell(1).font = { bold: true, color: { argb: 'FF991B1B' } };
            row.getCell(2).value = nl.cantidadSolicitada;
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(2).font = { strike: true, color: { argb: 'FF999999' } };
            row.getCell(3).value = nl.unidad ?? '';
            row.getCell(3).alignment = { horizontal: 'center' };
            row.getCell(4).value = nl.categoria ?? '';
            if (isRecibido) {
              row.getCell(5).value = 0;
              row.getCell(5).alignment = { horizontal: 'center' };
              row.getCell(5).font = { bold: true, color: { argb: 'FFDC2626' } };
            }
            for (let c = 1; c <= (isRecibido ? 5 : 4); c++) {
              row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
            }
            currentRow++;
          }
          currentRow++;
        }

        if (extras.length > 0) {
          const extLabel = sheet.getRow(currentRow);
          extLabel.getCell(1).value = 'LLEGARON SIN PEDIRLOS (REGISTRADOS)';
          extLabel.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF92400E' } };
          currentRow++;
          for (const ex of extras) {
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = ex.nombre;
            row.getCell(2).value = ex.cantidad;
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(2).font = { bold: true, color: { argb: 'FF92400E' } };
            row.getCell(3).value = ex.unidad ?? '';
            row.getCell(3).alignment = { horizontal: 'center' };
            row.getCell(4).value = ex.categoria ?? '';
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
            row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
            row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
            row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
            currentRow++;
          }
          currentRow++;
        }

        if (noReg.length > 0) {
          const nrLabel = sheet.getRow(currentRow);
          nrLabel.getCell(1).value = 'PRODUCTOS NO DADOS DE ALTA';
          nrLabel.getCell(1).font = { bold: true, size: 9, color: { argb: 'FFDC2626' } };
          currentRow++;
          for (const nr of noReg) {
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = nr.nombre;
            row.getCell(2).value = nr.cantidad;
            row.getCell(2).alignment = { horizontal: 'center' };
            row.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
            row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
            currentRow++;
          }
        }
        currentRow++;
      }
    }

    // Footer
    const footerRow = sheet.getRow(currentRow + 1);
    footerRow.getCell(1).value = `Total: ${pedido.detalles?.length ?? 0} productos · Generado el ${new Date().toLocaleDateString('es-ES')}`;
    footerRow.getCell(1).font = { size: 9, color: { argb: 'FF999999' }, italic: true };

    // Column widths
    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = isRecibido ? 12 : 30;
    if (isRecibido) sheet.getColumn(5).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pedido-${pedido.id}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Excel error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
