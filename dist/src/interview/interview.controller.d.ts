import { InterviewService } from './interview.service';
export declare class InterviewController {
    private readonly interviewService;
    constructor(interviewService: InterviewService);
    startInterview(body: {
        role: string;
        level: string;
        userId?: string;
        questionIds?: string[];
    }): Promise<{
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
    createQuestion(body: {
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
    updateQuestion(id: string, body: {
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
    transcribeAudio(sessionId: string, file: any): Promise<{
        text: string;
    }>;
}
