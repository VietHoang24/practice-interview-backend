import { InterviewService } from './interview.service';
export declare class InterviewController {
    private readonly interviewService;
    constructor(interviewService: InterviewService);
    startInterview(body: {
        role: string;
        level: string;
        userId?: string;
        questionIds?: string[];
        language?: string;
    }): Promise<{
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
    createQuestion(body: {
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
    updateQuestion(id: string, body: {
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
    submitAnswer(sessionId: string, body: {
        answer: string;
    }): Promise<{
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
    transcribeAudio(sessionId: string, file: any): Promise<{
        text: string;
    }>;
    createRealtimeSession(sessionId: string, body?: {
        language?: string;
    }): Promise<any>;
    evaluateTurn(sessionId: string, body: {
        questionText: string;
        userText: string;
        language?: string;
    }): Promise<{
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
    logMessage(sessionId: string, body: {
        role: string;
        content: string;
    }): Promise<{
        status: string;
    }>;
    skipIntro(sessionId: string, body?: {
        language?: string;
    }): Promise<{
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
    getInstructions(sessionId: string, body: {
        language: string;
    }): Promise<{
        instructions: string;
    }>;
}
