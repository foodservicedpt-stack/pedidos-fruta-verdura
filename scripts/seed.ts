import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Seed admin user
  const hashedPassword = await bcrypt.hash('johndoe123', 10);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { role: 'admin' },
    create: {
      email: 'john@doe.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log('✅ Admin user created');

  // Load seed data
  const dataPath = path.join(__dirname, '..', 'data', 'seed-data.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const seedData = JSON.parse(rawData);

  // Seed products
  const productMap: Record<string, number> = {};
  for (const p of seedData.products) {
    const product = await prisma.producto.upsert({
      where: {
        nombre_categoria: {
          nombre: p.nombre,
          categoria: p.categoria,
        },
      },
      update: {
        unidad: p.unidad,
        enTemporada: p.en_temporada,
        activo: p.activo,
        notas: p.notas || null,
        ordenSeccion: p.orden_seccion,
      },
      create: {
        nombre: p.nombre,
        categoria: p.categoria,
        unidad: p.unidad,
        enTemporada: p.en_temporada,
        activo: p.activo,
        notas: p.notas || null,
        ordenSeccion: p.orden_seccion,
      },
    });
    productMap[p.nombre] = product.id;
  }
  console.log(`✅ ${Object.keys(productMap).length} products seeded`);

  
  // Datos DEMO opcionales (solo si SEED_DEMO=1) para que las capacidades de IA
  // (recomendaciones, insights, tendencias, recepción) tengan datos reales que
  // mostrar. Sin esta variable la BD arranca limpia ("start from zero").
  if (process.env.SEED_DEMO === '1') {
    console.log('🌱 Añadiendo datos DEMO (histórico + pedidos de ejemplo)...');
    const now = new Date();

    const findProduct = async (kw: string) =>
      prisma.producto.findFirst({ where: { nombre: { contains: kw } } });

    // Histórico de consumo de las últimas 8 semanas para un conjunto representativo.
    const demos = [
      { kw: 'Tomate', base: 18, trend: +2 },
      { kw: 'Patata', base: 25, trend: 0 },
      { kw: 'Cebolla', base: 12, trend: 0 },
      { kw: 'Zanahoria', base: 8, trend: 0 },
      { kw: 'Plátano', base: 20, trend: 0 },
      { kw: 'Naranja', base: 15, trend: -1 },
      { kw: 'Manzana', base: 12, trend: 0 },
      { kw: 'Lechuga', base: 8, trend: +1 },
    ];
    for (const d of demos) {
      const prod = await findProduct(d.kw);
      if (!prod) continue;
      for (let w = 0; w < 8; w++) {
        const fecha = new Date(now);
        fecha.setDate(fecha.getDate() - w * 7);
        const qty = Math.max(1, d.base + d.trend * Math.floor((8 - w) / 2) + ((w % 3) - 1));
        await prisma.historicoPedido.upsert({
          where: { productoId_fecha: { productoId: prod.id, fecha } },
          update: { cantidad: qty },
          create: { productoId: prod.id, fecha, cantidad: qty },
        });
      }
    }

    // Un pedido ENVIADO (para el flujo de envío) y uno RECIBIDO (para mostrar
    // comparación pedido vs recepción y la detección de diferencias).
    const tomate = await findProduct('Tomate');
    const patata = await findProduct('Patata');
    const lechuga = await findProduct('Lechuga');
    const platano = await findProduct('Plátano');
    const naranja = await findProduct('Naranja');
    const admin = await prisma.user.findUnique({ where: { email: 'john@doe.com' } });

    const lineas = (items: { p: any; q: number; r?: number }[]) =>
      items.filter(i => i.p).map(i => ({
        productoId: i.p.id,
        cantidadSolicitada: i.q,
        cantidadRecibida: i.r ?? null,
        comentario: null as string | null,
      }));

    const fechaEntregaEnviado = new Date(now); fechaEntregaEnviado.setDate(fechaEntregaEnviado.getDate() + 3);
    const fechaEntregaRecibido = new Date(now); fechaEntregaRecibido.setDate(fechaEntregaRecibido.getDate() - 4);

    const enviado = await prisma.pedido.create({
      data: {
        tipoPedido: 'lunes-miercoles',
        fechaEntrega: fechaEntregaEnviado,
        estado: 'enviado',
        creadoPor: admin?.id ?? null,
        notas: 'Pedido de ejemplo (SEED_DEMO)',
        detalles: { create: lineas([
          { p: tomate, q: 18 }, { p: patata, q: 25 }, { p: lechuga, q: 8 }, { p: platano, q: 20 },
        ]) },
      },
    });

    const recibido = await prisma.pedido.create({
      data: {
        tipoPedido: 'miercoles-viernes',
        fechaEntrega: fechaEntregaRecibido,
        estado: 'recibido',
        creadoPor: admin?.id ?? null,
        notas: 'Recepción de ejemplo (SEED_DEMO)',
        extrasAlbaran: {
          extras: [{ productoId: naranja?.id ?? 0, nombre: naranja?.nombre ?? 'Naranja', cantidad: 5, unidad: 'Kg', categoria: 'Frutas' }],
          noLlegaron: [{ productoId: lechuga?.id ?? 0, nombre: lechuga?.nombre ?? 'Lechuga', cantidadSolicitada: 8, unidad: 'Ud', categoria: 'Ensaladas' }],
          noRegistrados: [],
        },
        detalles: { create: lineas([
          { p: tomate, q: 18, r: 17 }, { p: patata, q: 25, r: 25 }, { p: lechuga, q: 8, r: 0 }, { p: platano, q: 20, r: 20 },
        ]) },
      },
    });

    console.log('✅ Pedidos demo creados: #' + enviado.id + ' (enviado) y #' + recibido.id + ' (recibido con diferencia)');
  }


  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
