import OpenAI from 'openai';
export interface EvaluationResult {
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
    decision: {
        action: 'followup' | 'move_next';
    };
    next_message: string;
}
export interface MemorySummary {
    summary: string;
    strengths: string[];
    weaknesses: string[];
}
export declare class AiService {
    private openai;
    constructor();
    transcribeAudio(buffer: Buffer, filename: string): Promise<string>;
    getChatCompletion(messages: OpenAI.Chat.ChatCompletionMessageParam[], systemPrompt?: string): Promise<string | null>;
    evaluateAnswer(topic: string, rootQuestion: string, recentMessages: any[], memorySummary: any, candidateAnswer: string): Promise<EvaluationResult>;
    generateMemorySummary(messages: any[]): Promise<MemorySummary>;
}
