export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseIntId, optionalAuth } from '@/lib/api-helpers';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const estadoLabel: Record<string, string> = { borrador: 'Borrador', enviado: 'Enviado', recibido: 'Recibido' };
const tipoLabel: Record<string, string> = { 'lunes-miercoles': 'Lunes → Miércoles', 'miercoles-viernes': 'Miércoles → Viernes', 'jueves-lunes': 'Jueves → Lunes' };
const catColors: Record<string, [number, number, number]> = { Verduras: [0.30, 0.69, 0.31], Frutas: [1.0, 0.60, 0.0], Ensaladas: [0.13, 0.59, 0.95] };
const PH = 841.89, PW = 595.28, M = 40;

async function buildPdf(pedido: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const page = doc.addPage([PW, PH]);
  let top = M;

  // Las fuentes estándar de pdf-lib usan WinAnsi; sustituimos caracteres no soportados.
  const S = (s: any) => String(s ?? '').replace(/→/g, '-').replace(/←/g, '-').replace(/▲/g, '+').replace(/▼/g, '-').replace(/⚠/g, '!').replace(/✓/g, 'OK').replace(/[^\x00-\xFF]/g, '?');
  const drawText = (str: string, x: number, size: number, f: PDFFont, color: [number,number,number], width?: number) => {
    page.drawText(S(str), { x, y: PH - top, size, font: f, color: rgb(color[0], color[1], color[2]), ...(width ? { maxWidth: width } : {}) });
  };
  const rule = () => { page.drawLine({ start: { x: M, y: PH - top }, end: { x: PW - M, y: PH - top }, thickness: 1.5, color: rgb(0.30, 0.69, 0.31) }); };
  const ensureSpace = (needed: number) => { if (top + needed > PH - M) { doc.addPage(); top = M; } };

  // Cabecera
  drawText('Pedido de Fruta y Verdura', M, 19, bold, [0.18, 0.49, 0.20]);
  top += 24;
  drawText('Pedido #' + pedido.id, M, 11, font, [0.40, 0.40, 0.40]);
  top += 20;
  rule(); top += 16;

  // Metadatos
  const metaRows: [string, string][] = [['Estado', estadoLabel[pedido.estado] ?? pedido.estado], ['Fecha pedido', new Date(pedido.fechaPedido).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })]];
  if (pedido.fechaEntrega) metaRows.push(['Fecha entrega', new Date(pedido.fechaEntrega).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })]);
  if (pedido.tipoPedido) metaRows.push(['Tipo', tipoLabel[pedido.tipoPedido] ?? pedido.tipoPedido]);
  metaRows.push(['Creado por', pedido.user?.name ?? 'Equipo']);
  for (const [k, v] of metaRows) { ensureSpace(18); drawText(k, M, 10, bold, [0.40, 0.40, 0.40]); drawText(v, M + 90, 10, font, [0.20, 0.20, 0.20]); top += 17; }
  top += 8;

  if (pedido.notas) { ensureSpace(20); drawText('Notas:', M, 10, bold, [0.57, 0.25, 0.05]); drawText(String(pedido.notas), M + 50, 10, font, [0.20, 0.20, 0.20], 480); top += 20; }

  const byCategory: Record<string, any[]> = {};
  for (const d of (pedido.detalles ?? [])) { const cat = d.producto?.categoria ?? 'Otros'; (byCategory[cat] = byCategory[cat] ?? []).push(d); }
  const isRecibido = pedido.estado === 'recibido';

  for (const [cat, items] of Object.entries(byCategory)) {
    ensureSpace(70);
    const col = catColors[cat] ?? [0.40, 0.40, 0.40];
    // Cabecera de categoría
    page.drawRectangle({ x: M, y: PH - top, width: PW - 2 * M, height: 22, color: rgb(col[0], col[1], col[2]) });
    drawText(cat + ' (' + items.length + ')', M + 6, 12, bold, [1, 1, 1]); top += 28;
    // Cabecera de tabla
    const cols = isRecibido ? 5 : 4;
    const colW = (PW - 2 * M - 4) / cols;
    const hx = M + 4;
    drawText('Producto', hx, 9, bold, [0.4, 0.4, 0.4], colW - 4);
    const centered = (s: string, cx: number, w: number) => {
      const ss = S(s);
      const wpx = font.widthOfTextAtSize(ss, 9);
      page.drawText(ss, { x: cx + (w - wpx) / 2, y: PH - top, size: 9, font: bold, color: rgb(0.4, 0.4, 0.4) });
    };
    centered('Cantidad', hx + colW, colW);
    centered('Unidad', hx + colW * 2, colW);
    if (isRecibido) centered('Recibido', hx + colW * 3, colW);
    top += 15;
    page.drawLine({ start: { x: M, y: PH - top }, end: { x: PW - M, y: PH - top }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    top += 6;

    for (const d of items) {
      ensureSpace(20);
      const name = d.producto?.nombre ?? 'Producto';
      const sol = d.cantidadSolicitada ?? 0;
      const rec = d.cantidadRecibida;
      const hasDiff = isRecibido && rec !== null && rec !== undefined && rec !== sol;
      drawText(name, hx, 10, font, [0.20, 0.20, 0.20], colW - 4);
      const cell = (s: string, cx: number, w: number, c: [number,number,number] = [0.20,0.20,0.20], f: PDFFont = font, sz = 10) => { const ss = S(s); const wpx = f.widthOfTextAtSize(ss, sz); page.drawText(ss, { x: cx + (w - wpx) / 2, y: PH - top, size: sz, font: f, color: rgb(c[0], c[1], c[2]) }); };
      cell(String(sol), hx + colW, colW);
      cell(d.producto?.unidad ?? '', hx + colW * 2, colW);
      if (isRecibido) {
        if (hasDiff) cell(rec + ' (▲ ' + (rec - sol) + ')', hx + colW * 3, colW, rec - sol > 0 ? [0.18, 0.49, 0.20] : [0.78, 0.16, 0.16], bold);
        else cell(rec != null ? String(rec) : '-', hx + colW * 3, colW);
      }
      drawText(d.comentario ?? '', hx + colW * (isRecibido ? 4 : 3), 9, font, [0.55, 0.55, 0.55], colW - 4);
      top += 16;
    }
    top += 12;
  }

  // Incidencias
  const exd = pedido.extrasAlbaran;
  if (exd) {
    const extras = exd?.extras ?? [], noReg = exd?.noRegistrados ?? [], noLle = exd?.noLlegaron ?? [];
    if (extras.length || noReg.length || noLle.length) {
      ensureSpace(60);
      top += 6;
      page.drawRectangle({ x: M, y: PH - top, width: PW - 2 * M, height: 20, color: rgb(0.996, 0.95, 0.78) });
      drawText('Incidencias del albarán', M + 6, 11, bold, [0.57, 0.25, 0.05]); top += 28;
      if (noLle.length) { drawText('Productos del pedido no llegaron:', M, 10, bold, [0.86, 0.15, 0.15]); top += 14; for (const n of noLle) { drawText('• ' + n.nombre + ' — pedido ' + n.cantidadSolicitada + ' → recibido 0', M + 6, 10, font, [0.6, 0.10, 0.10]); top += 13; } top += 6; }
      if (extras.length) { drawText('Llegaron sin pedirlos:', M, 10, bold, [0.57, 0.25, 0.05]); top += 14; for (const e of extras) { drawText('• ' + e.nombre + ' — ' + e.cantidad + ' ' + e.unidad, M + 6, 10, font, [0.57, 0.25, 0.05]); top += 13; } top += 6; }
      if (noReg.length) { drawText('No dados de alta:', M, 10, bold, [0.86, 0.15, 0.15]); top += 14; for (const n of noReg) { drawText('• ' + n.nombre + ' — ' + n.cantidad, M + 6, 10, font, [0.6, 0.10, 0.10]); top += 13; } }
    }
  }

  // Pie
  drawText('Total: ' + (pedido.detalles?.length ?? 0) + ' productos · Generado el ' + new Date().toLocaleDateString('es-ES') + ' · Pedidos Fruta y Verdura', M, 9, oblique, [0.60, 0.60, 0.60]);

  const bytes = await doc.save();
  return bytes;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await optionalAuth();
  void auth;
  const id = parseIntId(params?.id);
  if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } }, detalles: { include: { producto: true }, orderBy: { producto: { nombre: 'asc' } } } },
    });
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    const buffer = await buildPdf(pedido);
    return new NextResponse(Buffer.from(buffer) as any, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="pedido-' + id + '.pdf"' } });
  } catch (error: any) {
    console.error('PDF error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error generando PDF' }, { status: 500 });
  }
}
