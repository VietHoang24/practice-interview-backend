import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_TEMPLATES } from './templates';

@Injectable()
export class InterviewService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async startInterview(role: string, level: string, userId: string = 'anonymous', questionIds?: string[]) {
    const sessionId = uuidv4();
    
    // Create session
    const session = await this.prisma.interviewSession.create({
      data: {
        sessionId,
        userId,
        role,
        level,
        currentQuestionIndex: 0,
      },
    });

    let questions: any[] = [];
    if (questionIds && questionIds.length > 0) {
      questions = await this.prisma.interviewQuestion.findMany({
        where: { id: { in: questionIds } },
      });
      // Sort questions to preserve the user's customized order
      questions.sort((a, b) => questionIds.indexOf(a.id) - questionIds.indexOf(b.id));
    } else {
      questions = await this.prisma.interviewQuestion.findMany({
        where: { role, level },
        orderBy: { orderIndex: 'asc' },
      });
    }

    if (!questions.length) {
      throw new NotFoundException('No questions found for this role and level');
    }

    const firstQuestion = questions[0];

    // Create the first AI message
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

  async processAnswer(sessionId: string, answer: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get questions for this session's role and level
    const questions = await this.prisma.interviewQuestion.findMany({
      where: { role: session.role, level: session.level },
      orderBy: { orderIndex: 'asc' },
    });

    if (session.currentQuestionIndex >= questions.length) {
      return { status: 'completed', message: 'Interview has concluded.' };
    }

    const currentQuestion = questions[session.currentQuestionIndex];

    // Save the user's answer
    await this.prisma.message.create({
      data: {
        sessionId,
        questionId: currentQuestion.id,
        role: 'user',
        content: answer,
      },
    });

    // Load recent messages for this question
    const recentMessages = await this.prisma.message.findMany({
      where: { sessionId, questionId: currentQuestion.id },
      orderBy: { createdAt: 'asc' },
    });

    // Load memory summary
    const memory = await this.prisma.interviewMemory.findUnique({
      where: { sessionId },
    });

    // Call AI to evaluate answer
    const aiResponse = await this.aiService.evaluateAnswer(
      currentQuestion.topic,
      currentQuestion.question,
      recentMessages,
      memory,
      answer,
    );

    // Save evaluation
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

    // Decision logic
    if (aiResponse.decision.action === 'move_next' || aiResponse.analysis.candidate_exhausted) {
      newQuestionIndex += 1;
      
      // Check if there are more questions
      if (newQuestionIndex < questions.length) {
        const nextRootQuestion = questions[newQuestionIndex];
        nextContent = aiResponse.next_message ? `${aiResponse.next_message}\n\n${nextRootQuestion.question}` : nextRootQuestion.question;
      } else {
        nextContent = aiResponse.next_message ? `${aiResponse.next_message}\n\nThat concludes our interview. Thank you!` : "That concludes our interview. Thank you!";
        await this.prisma.interviewSession.update({
          where: { sessionId },
          data: { status: 'completed' }
        });
      }

      // Update session with new question index
      await this.prisma.interviewSession.update({
        where: { sessionId },
        data: { currentQuestionIndex: newQuestionIndex },
      });

      // After a topic finishes, generate a new memory summary
      this.updateMemory(sessionId).catch(err => console.error('Failed to update memory:', err));
    }

    // Save AI response message
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

  private async updateMemory(sessionId: string) {
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

  async transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
    return this.aiService.transcribeAudio(buffer, filename);
  }

  async getTemplates(role?: string, level?: string) {
    const where: any = {};
    if (role) where.role = role.toLowerCase();
    if (level) where.level = level.toLowerCase();

    let templates = await this.prisma.questionTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    });

    // Auto-seed templates and questions if empty and role & level are provided
    if (templates.length === 0 && role && level) {
      const rKey = role.toLowerCase();
      const lKey = level.toLowerCase();
      const templateDefs = MOCK_TEMPLATES[rKey]?.[lKey];
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

          await Promise.all(
            tDef.questions.map((q) =>
              this.prisma.interviewQuestion.create({
                data: {
                  role: rKey,
                  level: lKey,
                  topic: q.topic,
                  question: q.question,
                  difficulty: q.difficulty,
                  orderIndex: q.orderIndex,
                  templateId: createdTemplate.id,
                },
              })
            )
          );
        }

        // Query again to get seeded templates with questions
        templates = await this.prisma.questionTemplate.findMany({
          where,
          orderBy: { name: 'asc' },
          include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
      }
    }

    return templates;
  }

  async getQuestions(templateId?: string) {
    const where: any = {};
    if (templateId) {
      where.templateId = templateId;
    }

    return this.prisma.interviewQuestion.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createQuestion(data: { role: string; level: string; topic: string; question: string; difficulty: number; orderIndex: number; templateId?: string }) {
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

  async updateQuestion(id: string, data: { topic?: string; question?: string; difficulty?: number; orderIndex?: number }) {
    return this.prisma.interviewQuestion.update({
      where: { id },
      data,
    });
  }

  async deleteQuestion(id: string) {
    return this.prisma.interviewQuestion.delete({
      where: { id },
    });
  }
}
