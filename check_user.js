const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://admin:admin123@155.133.26.217:5432/syncloudpos?schema=public"
    }
  }
})

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'xm@live.fr' },
    select: { id: true, email: true, name: true, password: true }
  })
  
  if (!user) {
    console.log('User not found')
    return
  }
  
  console.log('User found:', user.email)
  const match = await bcrypt.compare('Babez@16', user.password)
  console.log('Password matches:', match)
  
  if (!match) {
    console.log('Hashing new password...')
    const newHash = await bcrypt.hash('Babez@16', 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash }
    })
    console.log('Password updated')
  }
}

main().finally(() => prisma.$disconnect())
