import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { MOCK_TEMPLATES } from '../src/interview/templates';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database tables...');
  await prisma.interviewQuestion.deleteMany({});
  await prisma.questionTemplate.deleteMany({});

  console.log('Seeding templates and questions from MOCK_TEMPLATES...');

  for (const [role, levels] of Object.entries(MOCK_TEMPLATES)) {
    for (const [level, templatesList] of Object.entries(levels)) {
      console.log(`Seeding ${role} - ${level}...`);
      for (const tDef of templatesList) {
        const createdTemplate = await prisma.questionTemplate.create({
          data: {
            name: tDef.name,
            description: tDef.description,
            role: role.toLowerCase(),
            level: level.toLowerCase(),
          }
        });

        for (const q of tDef.questions) {
          await prisma.interviewQuestion.create({
            data: {
              role: role.toLowerCase(),
              level: level.toLowerCase(),
              topic: q.topic,
              question: q.question,
              difficulty: q.difficulty,
              orderIndex: q.orderIndex,
              templateId: createdTemplate.id,
            },
          });
        }
      }
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
