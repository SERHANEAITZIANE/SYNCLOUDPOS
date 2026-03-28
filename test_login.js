const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'chirpedbeo' },
          { email: 'chirpedbeo@chirpedbeo.online' },
          { name: 'chirpedbeo' }
        ]
      }
    });

    if (user) {
      console.log('User found:', user.email);
      // check password if needed, but we don't need to actually login yet
    } else {
      console.log('User chirpedbeo not found in database.');
      const allUsers = await prisma.user.findMany({ select: { email: true, name: true, role: true }});
      console.log('Available users:', allUsers);
    }
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
