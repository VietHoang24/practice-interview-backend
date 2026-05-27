import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class InterviewService {
    private prisma;
    private aiService;
    constructor(prisma: PrismaService, aiService: AiService);
    startInterview(role: string, level: string, userId?: string, questionIds?: string[]): Promise<{
        sessionId: string;
        question: any;
        message: {
            id: string;
            role: string;
            sessionId: string;
            questionId: string | null;
            content: string;
            metrics: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
        };
    }>;
    processAnswer(sessionId: string, answer: string): Promise<{
        status: string;
        message: string;
        action?: undefined;
        evaluation?: undefined;
        analysis?: undefined;
    } | {
        action: "followup" | "move_next";
        evaluation: {
            technical_score: number;
            communication_score: number;
            confidence_score: number;
        };
        analysis: {
            understanding_level: string;
            missing_areas: string[];
            candidate_exhausted: boolean;
        };
        message: {
            id: string;
            role: string;
            sessionId: string;
            questionId: string | null;
            content: string;
            metrics: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
        };
        status?: undefined;
    }>;
    private updateMemory;
    transcribeAudio(buffer: Buffer, filename: string): Promise<string>;
    getTemplates(role?: string, level?: string): Promise<({
        questions: {
            id: string;
            role: string;
            level: string;
            topic: string;
            question: string;
            difficulty: number;
            orderIndex: number;
            templateId: string | null;
        }[];
    } & {
        id: string;
        role: string;
        level: string;
        name: string;
        description: string | null;
    })[]>;
    getQuestions(templateId?: string): Promise<{
        id: string;
        role: string;
        level: string;
        topic: string;
        question: string;
        difficulty: number;
        orderIndex: number;
        templateId: string | null;
    }[]>;
    createQuestion(data: {
        role: string;
        level: string;
        topic: string;
        question: string;
        difficulty: number;
        orderIndex: number;
        templateId?: string;
    }): Promise<{
        id: string;
        role: string;
        level: string;
        topic: string;
        question: string;
        difficulty: number;
        orderIndex: number;
        templateId: string | null;
    }>;
    updateQuestion(id: string, data: {
        topic?: string;
        question?: string;
        difficulty?: number;
        orderIndex?: number;
    }): Promise<{
        id: string;
        role: string;
        level: string;
        topic: string;
        question: string;
        difficulty: number;
        orderIndex: number;
        templateId: string | null;
    }>;
    deleteQuestion(id: string): Promise<{
        id: string;
        role: string;
        level: string;
        topic: string;
        question: string;
        difficulty: number;
        orderIndex: number;
        templateId: string | null;
    }>;
}
