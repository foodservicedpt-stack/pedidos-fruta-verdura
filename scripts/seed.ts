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

  // Historical data seeding removed — user starts from zero

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
