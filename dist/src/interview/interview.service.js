"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const uuid_1 = require("uuid");
const templates_1 = require("./templates");
let InterviewService = class InterviewService {
    prisma;
    aiService;
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    async startInterview(role, level, userId = 'anonymous', questionIds) {
        const sessionId = (0, uuid_1.v4)();
        const session = await this.prisma.interviewSession.create({
            data: {
                sessionId,
                userId,
                role,
                level,
                currentQuestionIndex: 0,
            },
        });
        let questions = [];
        if (questionIds && questionIds.length > 0) {
            questions = await this.prisma.interviewQuestion.findMany({
                where: { id: { in: questionIds } },
            });
            questions.sort((a, b) => questionIds.indexOf(a.id) - questionIds.indexOf(b.id));
        }
        else {
            questions = await this.prisma.interviewQuestion.findMany({
                where: { role, level },
                orderBy: { orderIndex: 'asc' },
            });
        }
        if (!questions.length) {
            throw new common_1.NotFoundException('No questions found for this role and level');
        }
        const firstQuestion = questions[0];
        const initialAiMessage = await this.prisma.message.create({
            data: {
                sessionId,
                questionId: firstQuestion.id,
                role: 'assistant',
                content: firstQuestion.question,
            },
        });
        return {
            sessionId,
            question: firstQuestion,
            message: initialAiMessage,
        };
    }
    async processAnswer(sessionId, answer) {
        const session = await this.prisma.interviewSession.findUnique({
            where: { sessionId },
        });
        if (!session) {
            throw new common_1.NotFoundException('Session not found');
        }
        const questions = await this.prisma.interviewQuestion.findMany({
            where: { role: session.role, level: session.level },
            orderBy: { orderIndex: 'asc' },
        });
        if (session.currentQuestionIndex >= questions.length) {
            return { status: 'completed', message: 'Interview has concluded.' };
        }
        const currentQuestion = questions[session.currentQuestionIndex];
        await this.prisma.message.create({
            data: {
                sessionId,
                questionId: currentQuestion.id,
                role: 'user',
                content: answer,
            },
        });
        const recentMessages = await this.prisma.message.findMany({
            where: { sessionId, questionId: currentQuestion.id },
            orderBy: { createdAt: 'asc' },
        });
        const memory = await this.prisma.interviewMemory.findUnique({
            where: { sessionId },
        });
        const aiResponse = await this.aiService.evaluateAnswer(currentQuestion.topic, currentQuestion.question, recentMessages, memory, answer);
        await this.prisma.interviewEvaluation.create({
            data: {
                sessionId,
                questionId: currentQuestion.id,
                technicalScore: aiResponse.evaluation.technical_score || 0,
                communicationScore: aiResponse.evaluation.communication_score || 0,
                confidenceScore: aiResponse.evaluation.confidence_score || 0,
                feedback: JSON.stringify(aiResponse.analysis),
            },
        });
        let nextContent = aiResponse.next_message;
        let newQuestionIndex = session.currentQuestionIndex;
        if (aiResponse.decision.action === 'move_next' || aiResponse.analysis.candidate_exhausted) {
            newQuestionIndex += 1;
            if (newQuestionIndex < questions.length) {
                const nextRootQuestion = questions[newQuestionIndex];
                nextContent = aiResponse.next_message ? `${aiResponse.next_message}\n\n${nextRootQuestion.question}` : nextRootQuestion.question;
            }
            else {
                nextContent = aiResponse.next_message ? `${aiResponse.next_message}\n\nThat concludes our interview. Thank you!` : "That concludes our interview. Thank you!";
                await this.prisma.interviewSession.update({
                    where: { sessionId },
                    data: { status: 'completed' }
                });
            }
            await this.prisma.interviewSession.update({
                where: { sessionId },
                data: { currentQuestionIndex: newQuestionIndex },
            });
            this.updateMemory(sessionId).catch(err => console.error('Failed to update memory:', err));
        }
        const assistantMessage = await this.prisma.message.create({
            data: {
                sessionId,
                questionId: newQuestionIndex < questions.length ? questions[newQuestionIndex].id : currentQuestion.id,
                role: 'assistant',
                content: nextContent,
            },
        });
        return {
            action: aiResponse.decision.action,
            evaluation: aiResponse.evaluation,
            analysis: aiResponse.analysis,
            message: assistantMessage,
        };
    }
    async updateMemory(sessionId) {
        const messages = await this.prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
        const summaryResult = await this.aiService.generateMemorySummary(messages);
        await this.prisma.interviewMemory.upsert({
            where: { sessionId },
            update: {
                summary: summaryResult.summary || 'No summary provided',
                strengths: summaryResult.strengths || [],
                weaknesses: summaryResult.weaknesses || [],
            },
            create: {
                sessionId,
                summary: summaryResult.summary || 'No summary provided',
                strengths: summaryResult.strengths || [],
                weaknesses: summaryResult.weaknesses || [],
            },
        });
    }
    async transcribeAudio(buffer, filename) {
        return this.aiService.transcribeAudio(buffer, filename);
    }
    async getTemplates(role, level) {
        const where = {};
        if (role)
            where.role = role.toLowerCase();
        if (level)
            where.level = level.toLowerCase();
        let templates = await this.prisma.questionTemplate.findMany({
            where,
            orderBy: { name: 'asc' },
            include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
        if (templates.length === 0 && role && level) {
            const rKey = role.toLowerCase();
            const lKey = level.toLowerCase();
            const templateDefs = templates_1.MOCK_TEMPLATES[rKey]?.[lKey];
            if (templateDefs && templateDefs.length > 0) {
                console.log(`Auto-seeding templates and questions for ${rKey} - ${lKey}...`);
                for (const tDef of templateDefs) {
                    const createdTemplate = await this.prisma.questionTemplate.create({
                        data: {
                            name: tDef.name,
                            description: tDef.description,
                            role: rKey,
                            level: lKey,
                        }
                    });
                    await Promise.all(tDef.questions.map((q) => this.prisma.interviewQuestion.create({
                        data: {
                            role: rKey,
                            level: lKey,
                            topic: q.topic,
                            question: q.question,
                            difficulty: q.difficulty,
                            orderIndex: q.orderIndex,
                            templateId: createdTemplate.id,
                        },
                    })));
                }
                templates = await this.prisma.questionTemplate.findMany({
                    where,
                    orderBy: { name: 'asc' },
                    include: { questions: { orderBy: { orderIndex: 'asc' } } }
                });
            }
        }
        return templates;
    }
    async getQuestions(templateId) {
        const where = {};
        if (templateId) {
            where.templateId = templateId;
        }
        return this.prisma.interviewQuestion.findMany({
            where,
            orderBy: { orderIndex: 'asc' },
        });
    }
    async createQuestion(data) {
        return this.prisma.interviewQuestion.create({
            data: {
                role: data.role.toLowerCase(),
                level: data.level.toLowerCase(),
                topic: data.topic,
                question: data.question,
                difficulty: data.difficulty,
                orderIndex: data.orderIndex,
                templateId: data.templateId,
            },
        });
    }
    async updateQuestion(id, data) {
        return this.prisma.interviewQuestion.update({
            where: { id },
            data,
        });
    }
    async deleteQuestion(id) {
        return this.prisma.interviewQuestion.delete({
            where: { id },
        });
    }
};
exports.InterviewService = InterviewService;
exports.InterviewService = InterviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], InterviewService);
//# sourceMappingURL=interview.service.js.map