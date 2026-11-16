// ============================================================
// WayGo - Seed de datos base
// Crea: roles, tipos de servicio, criterios de evaluacion y
// un usuario ADMIN inicial.
// Ejecutar desde backend/: npm run prisma:seed
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando datos base de WayGo...');

  // ---------------- Roles ----------------
  const roles = [
    { name: 'ADMIN', description: 'Administrador de la plataforma' },
    { name: 'CUSTOMER', description: 'Cliente que solicita servicios' },
    { name: 'DRIVER', description: 'Conductor que oferta y presta servicios' },
    { name: 'CALL_CENTER', description: 'Operador del centro de control' },
  ];
  for (const r of roles) {
    await prisma.role.upsert({ where: { name: r.name }, update: { description: r.description }, create: r });
  }
  console.log('  Roles: OK');

  // ---------------- Tipos de servicio ----------------
  const serviceTypes = [
    { code: 'PASSENGER', name: 'Transporte de pasajeros', description: 'Servicio puntual de transporte de personas' },
    { code: 'PACKAGE', name: 'Transporte de paquetes', description: 'Envio y entrega de paqueteria con evidencia' },
    { code: 'MONTHLY', name: 'Contrato mensual', description: 'Servicios recurrentes contratados mensualmente' },
  ];
  for (const st of serviceTypes) {
    await prisma.serviceType.upsert({ where: { code: st.code }, update: { name: st.name, description: st.description }, create: st });
  }
  console.log('  Tipos de servicio: OK');

  // ---------------- Criterios de evaluacion ----------------
  const criteria = [
    { code: 'PUNCTUALITY', name: 'Puntualidad', appliesTo: 'CUSTOMER_TO_DRIVER' },
    { code: 'PRESENTATION', name: 'Presentacion personal', appliesTo: 'CUSTOMER_TO_DRIVER' },
    { code: 'KINDNESS', name: 'Amabilidad', appliesTo: 'CUSTOMER_TO_DRIVER' },
    { code: 'QUALITY', name: 'Calidad del servicio', appliesTo: 'CUSTOMER_TO_DRIVER' },
    { code: 'SAFETY', name: 'Seguridad', appliesTo: 'CUSTOMER_TO_DRIVER' },
    { code: 'VEHICLE_STATE', name: 'Estado del vehiculo', appliesTo: 'CUSTOMER_VEHICLE_SERVICE' },
    { code: 'INSTRUCTIONS', name: 'Cumplimiento de instrucciones', appliesTo: 'CUSTOMER_VEHICLE_SERVICE' },
    { code: 'CUSTOMER_KINDNESS', name: 'Amabilidad del cliente', appliesTo: 'DRIVER_TO_CUSTOMER' },
    { code: 'CUSTOMER_PUNCTUALITY', name: 'Puntualidad del cliente', appliesTo: 'DRIVER_TO_CUSTOMER' },
    { code: 'CUSTOMER_INSTRUCTIONS', name: 'Claridad de instrucciones del cliente', appliesTo: 'DRIVER_TO_CUSTOMER' },
  ];
  for (const c of criteria) {
    await prisma.reviewCriteria.upsert({ where: { code: c.code }, update: { name: c.name, appliesTo: c.appliesTo }, create: c });
  }
  console.log('  Criterios de evaluacion: OK');

  // ---------------- Usuario administrador ----------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@waygo.local').toLowerCase();
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`  Admin ya existe (${adminEmail}), no se modifica.`);
  } else {
    // La contrasena se toma de SEED_ADMIN_PASSWORD o se genera aleatoria
    const generated = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '') + 'Wg1!';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || generated;
    const passwordHash = await bcrypt.hash(adminPassword, Number(process.env.BCRYPT_ROUNDS || 12));

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        roleId: adminRole.id,
        profile: {
          create: {
            firstName: 'Administrador',
            lastName: 'WayGo',
          },
        },
      },
    });
    console.log(`  Admin creado: ${adminEmail}`);
    if (process.env.SEED_ADMIN_PASSWORD) {
      console.log('  Contrasena tomada de SEED_ADMIN_PASSWORD (definida en backend/.env).');
    } else {
      console.log(`  CONTRASENA TEMPORAL DEL ADMIN: ${adminPassword}`);
      console.log('  (Guardala ahora; no se volvera a mostrar.)');
    }
  }

  // ---------------- Operador de call center ----------------
  const ccEmail = (process.env.SEED_CALLCENTER_EMAIL || 'callcenter@waygo.local').toLowerCase();
  const ccRole = await prisma.role.findUnique({ where: { name: 'CALL_CENTER' } });
  const ccExisting = await prisma.user.findUnique({ where: { email: ccEmail } });
  if (ccExisting) {
    console.log(`  Operador call center ya existe (${ccEmail}).`);
  } else {
    const ccPassword = process.env.SEED_CALLCENTER_PASSWORD || crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '') + 'Wg1!';
    const passwordHash = await bcrypt.hash(ccPassword, Number(process.env.BCRYPT_ROUNDS || 12));
    await prisma.user.create({
      data: {
        email: ccEmail,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        roleId: ccRole.id,
        profile: { create: { firstName: 'Operador', lastName: 'Call Center' } },
        callCenterProfile: { create: { shift: 'TARDE', isOnDuty: true } },
      },
    });
    console.log(`  Operador call center creado: ${ccEmail}`);
    if (process.env.SEED_CALLCENTER_PASSWORD) {
      console.log('  Contrasena tomada de SEED_CALLCENTER_PASSWORD.');
    } else {
      console.log(`  CONTRASENA TEMPORAL DEL CALL CENTER: ${ccPassword}`);
    }
  }

  console.log('Seed finalizado correctamente.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
