import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class InterviewService {
    private prisma;
    private aiService;
    constructor(prisma: PrismaService, aiService: AiService);
    startInterview(role: string, level: string, userId?: string, questionIds?: string[], language?: string): Promise<{
        sessionId: string;
        question: any;
        message: {
            role: string;
            id: string;
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
            role: string;
            id: string;
            sessionId: string;
            questionId: string | null;
            content: string;
            metrics: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
        };
        status: string;
    }>;
    private isFailedEvaluation;
    private updateMemory;
    transcribeAudio(buffer: Buffer, filename: string): Promise<string>;
    getTemplates(role?: string, level?: string): Promise<({
        questions: {
            role: string;
            level: string;
            id: string;
            topic: string;
            question: string;
            difficulty: number;
            orderIndex: number;
            templateId: string | null;
        }[];
    } & {
        role: string;
        level: string;
        id: string;
        name: string;
        description: string | null;
    })[]>;
    getQuestions(templateId?: string): Promise<{
        role: string;
        level: string;
        id: string;
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
        role: string;
        level: string;
        id: string;
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
        role: string;
        level: string;
        id: string;
        topic: string;
        question: string;
        difficulty: number;
        orderIndex: number;
        templateId: string | null;
    }>;
    deleteQuestion(id: string): Promise<{
        role: string;
        level: string;
        id: string;
        topic: string;
        question: string;
        difficulty: number;
        orderIndex: number;
        templateId: string | null;
    }>;
    getInstructions(sessionId: string, language: string): Promise<{
        instructions: string;
    }>;
    createRealtimeSessionToken(sessionId: string, language?: string): Promise<any>;
    evaluateTurn(sessionId: string, questionText: string, userText: string, language?: string): Promise<{
        action: string;
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
        message: null;
        status: string;
        currentQuestionIndex: number;
    }>;
    skipIntro(sessionId: string, language?: string): Promise<{
        status: string;
        message: string;
        action?: undefined;
        evaluation?: undefined;
        analysis?: undefined;
        currentQuestionIndex?: undefined;
    } | {
        action: string;
        evaluation: {
            technical_score: number;
            communication_score: number;
            confidence_score: number;
        };
        analysis: {
            understanding_level: string;
            missing_areas: never[];
            candidate_exhausted: boolean;
        };
        message: {
            role: string;
            id: string;
            sessionId: string;
            questionId: string | null;
            content: string;
            metrics: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
        };
        status: string;
        currentQuestionIndex: number;
    }>;
}
