import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const juniorFrontendQuestions = [
  {
    role: 'frontend',
    level: 'junior',
    topic: 'react',
    question: 'What is React re-render?',
    difficulty: 2,
    orderIndex: 1,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'react',
    question: 'What are React hooks? Can you explain useState and useEffect?',
    difficulty: 2,
    orderIndex: 2,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'javascript',
    question: 'Can you explain the difference between let, const, and var?',
    difficulty: 1,
    orderIndex: 3,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'javascript',
    question: 'What is a Promise in JavaScript? How does it differ from a callback?',
    difficulty: 3,
    orderIndex: 4,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'css',
    question: 'What is the CSS Box Model?',
    difficulty: 1,
    orderIndex: 5,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'css',
    question: 'How do you center an element using Flexbox?',
    difficulty: 2,
    orderIndex: 6,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'javascript',
    question: 'Can you explain event delegation in JavaScript?',
    difficulty: 3,
    orderIndex: 7,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'html',
    question: 'What are semantic HTML tags and why are they important?',
    difficulty: 2,
    orderIndex: 8,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'react',
    question: 'What is the Virtual DOM and how does React use it?',
    difficulty: 3,
    orderIndex: 9,
  },
  {
    role: 'frontend',
    level: 'junior',
    topic: 'web',
    question: 'What is CORS? Have you ever encountered a CORS error and how did you fix it?',
    difficulty: 3,
    orderIndex: 10,
  },
];

async function main() {
  console.log('Seeding InterviewQuestions...');

  await prisma.interviewQuestion.deleteMany({});

  for (const q of juniorFrontendQuestions) {
    await prisma.interviewQuestion.create({
      data: q,
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
