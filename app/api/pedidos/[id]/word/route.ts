export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel,
  ShadingType, TableLayoutType,
} from 'docx';
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
    const isRecibido = pedido.estado === 'recibido';
    const colCount = isRecibido ? 5 : 4;

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const d of (pedido.detalles ?? [])) {
      const cat = d.producto?.categoria ?? 'Otros';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(d);
    }

    const catColors: Record<string, string> = { Verduras: '4CAF50', Frutas: 'FF9800', Ensaladas: '2196F3' };
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };

    const children: any[] = [];

    // Title
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `Pedido #${pedido.id} - Fruta y Verdura`, bold: true, size: 32, color: '2E7D32' }),
      ],
      spacing: { after: 200 },
    }));

    // Info
    const infoLines = [
      `Estado: ${estadoLabel[pedido.estado] ?? pedido.estado}`,
      `Fecha pedido: ${new Date(pedido.fechaPedido).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
      ...(pedido.fechaEntrega ? [`Fecha entrega: ${new Date(pedido.fechaEntrega).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`] : []),
      ...(pedido.tipoPedido ? [`Tipo: ${tipoLabel[pedido.tipoPedido] ?? pedido.tipoPedido}`] : []),
      `Creado por: ${pedido.user?.name ?? 'Usuario'}`,
      ...(pedido.notas ? [`Notas: ${pedido.notas}`] : []),
    ];

    for (const line of infoLines) {
      const [label, ...rest] = line.split(': ');
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 20, color: '666666' }),
          new TextRun({ text: rest.join(': '), size: 20 }),
        ],
        spacing: { after: 60 },
      }));
    }

    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

    // Tables per category
    for (const [cat, items] of Object.entries(byCategory)) {
      const color = catColors[cat] ?? '666666';

      // Category header
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${cat} (${items.length})`, bold: true, size: 24, color: color }),
        ],
        spacing: { before: 200, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: color } },
      }));

      // Header row
      const headerTexts = ['Producto', 'Cantidad', 'Unidad', ...(isRecibido ? ['Recibido'] : []), 'Notas'];
      const headerCells = headerTexts.map((text) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 18, color: '666666' })],
          alignment: text === 'Producto' || text === 'Notas' ? AlignmentType.LEFT : AlignmentType.CENTER,
        })],
        shading: { type: ShadingType.SOLID, color: 'F0F0F0', fill: 'F0F0F0' },
        borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
      }));

      const dataRows = items.map((d: any) => {
        const cells = [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: d.producto?.nombre ?? 'Producto', size: 20 })] })],
            borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(d.cantidadSolicitada ?? 0), bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
            borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: d.producto?.unidad ?? '', size: 20 })], alignment: AlignmentType.CENTER })],
            borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder },
          }),
        ];
        if (isRecibido) {
          const sol = d.cantidadSolicitada ?? 0;
          const rec = d.cantidadRecibida;
          const hasDiff = rec !== null && rec !== undefined && rec !== sol;
          const runs: any[] = [new TextRun({ text: rec != null ? String(rec) : '-', bold: hasDiff, size: 20, color: hasDiff ? (rec > sol ? '2E7D32' : 'C62828') : '333333' })];
          if (hasDiff) {
            const delta = rec - sol;
            const arrow = delta > 0 ? ` (▲ +${delta})` : ` (▼ ${delta})`;
            runs.push(new TextRun({ text: arrow, bold: true, size: 18, color: delta > 0 ? '2E7D32' : 'C62828' }));
          }
          cells.push(new TableCell({
            children: [new Paragraph({
              children: runs,
              alignment: AlignmentType.CENTER,
            })],
            borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder },
          }));
        }
        cells.push(new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: d.comentario ?? '', size: 18, color: '999999', italics: true })] })],
          borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder },
        }));
        return new TableRow({ children: cells });
      });

      const table = new Table({
        rows: [
          new TableRow({ children: headerCells, tableHeader: true }),
          ...dataRows,
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.AUTOFIT,
      });

      children.push(table);
      children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    }

    // Extras/unknowns/noLlegaron section
    const extData = pedido.extrasAlbaran as any;
    if (extData) {
      const extras = extData?.extras ?? [];
      const noReg = extData?.noRegistrados ?? [];
      const noLlegaron = extData?.noLlegaron ?? [];
      if (extras.length > 0 || noReg.length > 0 || noLlegaron.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: '⚠️ Incidencias del albarán', bold: true, size: 24, color: '92400E' })],
          spacing: { before: 300, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'F59E0B' } },
        }));

        if (noLlegaron.length > 0) {
          children.push(new Paragraph({
            children: [new TextRun({ text: 'NO DETECTADOS EN ALBARANES (NO LLEGARON)', bold: true, size: 16, color: 'DC2626' })],
            spacing: { before: 100, after: 60 },
          }));
          const nlHeaderCells = ['Producto', 'Pedido', 'Recibido', 'Unidad', 'Categoría'].map(text => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: '991B1B' })], alignment: text === 'Producto' || text === 'Categoría' ? AlignmentType.LEFT : AlignmentType.CENTER })],
            shading: { type: ShadingType.SOLID, color: 'FEF2F2', fill: 'FEF2F2' },
            borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
          }));
          const nlRows = noLlegaron.map((nl: any) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: nl.nombre ?? '', bold: true, size: 20, color: '991B1B' })] })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(nl.cantidadSolicitada ?? 0), size: 20, color: '999999', strike: true })], alignment: AlignmentType.CENTER })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '0', bold: true, size: 20, color: 'DC2626' })], alignment: AlignmentType.CENTER })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: nl.unidad ?? '', size: 20 })], alignment: AlignmentType.CENTER })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: nl.categoria ?? '', size: 18, color: '666666' })] })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
            ],
          }));
          children.push(new Table({
            rows: [new TableRow({ children: nlHeaderCells, tableHeader: true }), ...nlRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.AUTOFIT,
          }));
        }

        if (extras.length > 0) {
          children.push(new Paragraph({
            children: [new TextRun({ text: 'LLEGARON SIN PEDIRLOS (REGISTRADOS)', bold: true, size: 16, color: '92400E' })],
            spacing: { before: 150, after: 60 },
          }));
          const extHeaderCells = ['Producto', 'Cantidad', 'Unidad', 'Categoría'].map(text => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: '92400E' })], alignment: text === 'Producto' || text === 'Categoría' ? AlignmentType.LEFT : AlignmentType.CENTER })],
            shading: { type: ShadingType.SOLID, color: 'FEF3C7', fill: 'FEF3C7' },
            borders: { top: thinBorder, bottom: thinBorder, left: noBorder, right: noBorder },
          }));
          const extRows = extras.map((ex: any) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ex.nombre ?? '', size: 20 })] })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(ex.cantidad ?? 0), bold: true, size: 20, color: '92400E' })], alignment: AlignmentType.CENTER })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ex.unidad ?? '', size: 20 })], alignment: AlignmentType.CENTER })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ex.categoria ?? '', size: 18, color: '666666' })] })], borders: { top: noBorder, bottom: thinBorder, left: noBorder, right: noBorder } }),
            ],
          }));
          children.push(new Table({
            rows: [new TableRow({ children: extHeaderCells, tableHeader: true }), ...extRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.AUTOFIT,
          }));
        }

        if (noReg.length > 0) {
          children.push(new Paragraph({
            children: [new TextRun({ text: 'PRODUCTOS NO DADOS DE ALTA', bold: true, size: 16, color: 'DC2626' })],
            spacing: { before: 150, after: 60 },
          }));
          for (const nr of noReg) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${nr.nombre}`, size: 20, color: '991B1B' }),
                new TextRun({ text: `  →  ${nr.cantidad}`, bold: true, size: 20, color: 'DC2626' }),
              ],
              spacing: { after: 40 },
            }));
          }
        }

        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    }

    // Footer
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `Total: ${pedido.detalles?.length ?? 0} productos · Generado el ${new Date().toLocaleDateString('es-ES')}`, size: 16, color: '999999', italics: true }),
      ],
      spacing: { before: 300 },
    }));

    const doc = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="pedido-${pedido.id}.docx"`,
      },
    });
  } catch (error: any) {
    console.error('Word error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
