import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@akb.local' },
    update: {},
    create: {
      email: 'admin@akb.local',
      name: 'Admin',
      password: hashed,
      role: 'ADMIN',
    },
  });

  console.log('Seed user:', user.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
