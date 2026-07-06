"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const templates_1 = require("../src/interview/templates");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Clearing database tables...');
    await prisma.interviewQuestion.deleteMany({});
    await prisma.questionTemplate.deleteMany({});
    console.log('Seeding templates and questions from MOCK_TEMPLATES...');
    for (const [role, levels] of Object.entries(templates_1.MOCK_TEMPLATES)) {
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
//# sourceMappingURL=seed.js.map