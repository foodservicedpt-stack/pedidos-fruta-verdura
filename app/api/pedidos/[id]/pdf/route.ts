export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const d of (pedido.detalles ?? [])) {
      const cat = d.producto?.categoria ?? 'Otros';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(d);
    }

    const catColors: Record<string, string> = {
      Verduras: '#4CAF50',
      Frutas: '#FF9800',
      Ensaladas: '#2196F3',
    };

    const categorySections = Object.entries(byCategory).map(([cat, items]) => {
      const color = catColors[cat] ?? '#666';
      const rows = items.map((d: any) => {
        const sol = d.cantidadSolicitada ?? 0;
        const rec = d.cantidadRecibida;
        const hasDiff = rec !== null && rec !== undefined && rec !== sol;
        let diffLabel = '';
        let diffColor = '';
        if (hasDiff) {
          const delta = rec - sol;
          if (delta > 0) {
            diffLabel = ` <span style="font-size:11px;color:#2e7d32;font-weight:600;">(▲ +${delta})</span>`;
            diffColor = 'color:#2e7d32;font-weight:600;';
          } else {
            diffLabel = ` <span style="font-size:11px;color:#c62828;font-weight:600;">(▼ ${delta})</span>`;
            diffColor = 'color:#c62828;font-weight:600;';
          }
        }
        return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${d.producto?.nombre ?? 'Producto'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;font-weight:600;">${sol}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${d.producto?.unidad ?? ''}</td>
          ${pedido.estado === 'recibido' ? `<td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;${diffColor}">${rec ?? '-'}${diffLabel}</td>` : ''}
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#666;">${d.comentario ?? ''}</td>
        </tr>
      `;
      }).join('');

      return `
        <div style="margin-bottom:20px;">
          <h3 style="color:${color};font-size:15px;margin:0 0 8px 0;padding:6px 12px;background:${color}11;border-left:3px solid ${color};border-radius:0 4px 4px 0;">${cat} (${items.length})</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600;">Producto</th>
                <th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;font-weight:600;">Cantidad</th>
                <th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;font-weight:600;">Unidad</th>
                ${pedido.estado === 'recibido' ? '<th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;font-weight:600;">Recibido</th>' : ''}
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600;">Notas</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    const estadoLabel: Record<string, string> = { borrador: 'Borrador', enviado: 'Enviado', recibido: 'Recibido' };
    const estadoColor: Record<string, string> = { borrador: '#f59e0b', enviado: '#3b82f6', recibido: '#22c55e' };

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:'Helvetica Neue',Arial,sans-serif;color:#333;margin:0;padding:30px;">
        <div style="max-width:800px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4CAF50;padding-bottom:15px;margin-bottom:25px;">
            <div>
              <h1 style="margin:0;font-size:22px;color:#2e7d32;">Pedido de Fruta y Verdura</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#666;">Pedido #${pedido.id}</p>
            </div>
            <div style="text-align:right;">
              <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;color:white;background:${estadoColor[pedido.estado] ?? '#666'};">${estadoLabel[pedido.estado] ?? pedido.estado}</span>
            </div>
          </div>

          <div style="display:flex;gap:20px;margin-bottom:25px;flex-wrap:wrap;">
            <div style="flex:1;min-width:150px;padding:10px 15px;background:#f8f9fa;border-radius:8px;">
              <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Fecha pedido</p>
              <p style="margin:3px 0 0;font-size:14px;font-weight:600;">${new Date(pedido.fechaPedido).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            ${pedido.fechaEntrega ? `
            <div style="flex:1;min-width:150px;padding:10px 15px;background:#f8f9fa;border-radius:8px;">
              <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Fecha entrega</p>
              <p style="margin:3px 0 0;font-size:14px;font-weight:600;">${new Date(pedido.fechaEntrega).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            ` : ''}
            ${pedido.tipoPedido ? `
            <div style="flex:1;min-width:150px;padding:10px 15px;background:#f8f9fa;border-radius:8px;">
              <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Tipo</p>
              <p style="margin:3px 0 0;font-size:14px;font-weight:600;">${tipoLabel[pedido.tipoPedido] ?? pedido.tipoPedido}</p>
            </div>
            ` : ''}
            <div style="flex:1;min-width:150px;padding:10px 15px;background:#f8f9fa;border-radius:8px;">
              <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Creado por</p>
              <p style="margin:3px 0 0;font-size:14px;font-weight:600;">${pedido.user?.name ?? 'Usuario'}</p>
            </div>
          </div>

          ${pedido.notas ? `<div style="padding:10px 15px;background:#fff3e0;border-radius:8px;margin-bottom:25px;"><p style="margin:0;font-size:13px;"><strong>Notas:</strong> ${pedido.notas}</p></div>` : ''}

          ${categorySections}

          ${(() => {
            const extData = pedido.extrasAlbaran as any;
            if (!extData) return '';
            const extras = extData?.extras ?? [];
            const noReg = extData?.noRegistrados ?? [];
            const noLlegaron = extData?.noLlegaron ?? [];
            if (extras.length === 0 && noReg.length === 0 && noLlegaron.length === 0) return '';
            let html = '<div style="margin-top:20px;border:2px solid #f59e0b;border-radius:8px;overflow:hidden;">';
            html += '<div style="background:#fef3c7;padding:10px 15px;"><h3 style="margin:0;font-size:14px;color:#92400e;">⚠️ Incidencias del albarán</h3></div>';
            if (noLlegaron.length > 0) {
              html += '<div style="padding:10px 15px;">';
              html += '<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#dc2626;text-transform:uppercase;">⚠ Productos del pedido no detectados en albaranes (no llegaron)</p>';
              html += '<table style="width:100%;border-collapse:collapse;">';
              html += '<thead><tr style="background:#fef2f2;"><th style="padding:6px 12px;text-align:left;font-size:11px;color:#991b1b;">Producto</th><th style="padding:6px 12px;text-align:center;font-size:11px;color:#991b1b;">Pedido</th><th style="padding:6px 12px;text-align:center;font-size:11px;color:#991b1b;">Recibido</th><th style="padding:6px 12px;text-align:center;font-size:11px;color:#991b1b;">Unidad</th><th style="padding:6px 12px;text-align:left;font-size:11px;color:#991b1b;">Categoría</th></tr></thead><tbody>';
              for (const nl of noLlegaron) {
                html += `<tr><td style="padding:6px 12px;border-bottom:1px solid #fecaca;font-size:13px;font-weight:600;color:#991b1b;">${nl.nombre}</td><td style="padding:6px 12px;border-bottom:1px solid #fecaca;font-size:13px;text-align:center;text-decoration:line-through;color:#999;">${nl.cantidadSolicitada}</td><td style="padding:6px 12px;border-bottom:1px solid #fecaca;font-size:13px;text-align:center;font-weight:700;color:#dc2626;">0</td><td style="padding:6px 12px;border-bottom:1px solid #fecaca;font-size:13px;text-align:center;">${nl.unidad ?? ''}</td><td style="padding:6px 12px;border-bottom:1px solid #fecaca;font-size:12px;color:#666;">${nl.categoria ?? ''}</td></tr>`;
              }
              html += '</tbody></table></div>';
            }
            if (extras.length > 0) {
              html += '<div style="padding:10px 15px;border-top:1px solid #fde68a;">';
              html += '<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;">Llegaron sin pedirlos (registrados en el sistema)</p>';
              html += '<table style="width:100%;border-collapse:collapse;">';
              html += '<thead><tr style="background:#fef9ee;"><th style="padding:6px 12px;text-align:left;font-size:11px;color:#92400e;">Producto</th><th style="padding:6px 12px;text-align:center;font-size:11px;color:#92400e;">Cantidad</th><th style="padding:6px 12px;text-align:center;font-size:11px;color:#92400e;">Unidad</th><th style="padding:6px 12px;text-align:left;font-size:11px;color:#92400e;">Categoría</th></tr></thead><tbody>';
              for (const ex of extras) {
                html += `<tr><td style="padding:6px 12px;border-bottom:1px solid #fde68a;font-size:13px;">${ex.nombre}</td><td style="padding:6px 12px;border-bottom:1px solid #fde68a;font-size:13px;text-align:center;font-weight:600;color:#92400e;">${ex.cantidad}</td><td style="padding:6px 12px;border-bottom:1px solid #fde68a;font-size:13px;text-align:center;">${ex.unidad ?? ''}</td><td style="padding:6px 12px;border-bottom:1px solid #fde68a;font-size:12px;color:#666;">${ex.categoria ?? ''}</td></tr>`;
              }
              html += '</tbody></table></div>';
            }
            if (noReg.length > 0) {
              html += '<div style="padding:10px 15px;border-top:1px solid #fde68a;">';
              html += '<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#dc2626;text-transform:uppercase;">Productos no dados de alta en el sistema</p>';
              for (const nr of noReg) {
                html += `<div style="display:flex;justify-content:space-between;padding:5px 12px;background:#fef2f2;border-radius:4px;margin-bottom:4px;"><span style="font-size:13px;color:#991b1b;">${nr.nombre}</span><span style="font-size:13px;font-weight:600;color:#dc2626;">${nr.cantidad}</span></div>`;
              }
              html += '</div>';
            }
            html += '</div>';
            return html;
          })()}

          <div style="margin-top:25px;padding-top:15px;border-top:1px solid #eee;text-align:center;">
            <p style="font-size:11px;color:#999;">Total: ${pedido.detalles?.length ?? 0} productos · Generado el ${new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate PDF via Abacus API
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: html,
        pdf_options: { format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }, print_background: true },
      }),
    });

    if (!createResponse.ok) {
      return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 });

    // Poll for status
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      const statusRes = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
      });
      const statusResult = await statusRes.json();
      if (statusResult?.status === 'SUCCESS' && statusResult?.result?.result) {
        const pdfBuffer = Buffer.from(statusResult.result.result, 'base64');
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="pedido-${pedido.id}.pdf"`,
          },
        });
      } else if (statusResult?.status === 'FAILED') {
        return NextResponse.json({ error: 'Fallo en la generación del PDF' }, { status: 500 });
      }
      attempts++;
    }

    return NextResponse.json({ error: 'Tiempo de espera agotado' }, { status: 500 });
  } catch (error: any) {
    console.error('PDF error:', error?.message);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
