export interface TemplateQuestion {
    topic: string;
    question: string;
    difficulty: number;
    orderIndex: number;
}
export interface TemplateDefinition {
    name: string;
    description: string;
    questions: TemplateQuestion[];
}
export declare const MOCK_TEMPLATES: Record<string, Record<string, TemplateDefinition[]>>;
