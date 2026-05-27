"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importStar(require("openai"));
let AiService = class AiService {
    openai;
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async transcribeAudio(buffer, filename) {
        try {
            const file = await (0, openai_1.toFile)(buffer, filename);
            const response = await this.openai.audio.transcriptions.create({
                file,
                model: 'whisper-1',
            });
            return response.text;
        }
        catch (error) {
            console.error('Whisper transcription error:', error);
            throw error;
        }
    }
    async getChatCompletion(messages, systemPrompt) {
        const allMessages = [];
        if (systemPrompt) {
            allMessages.push({ role: 'system', content: systemPrompt });
        }
        allMessages.push(...messages);
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: allMessages,
        });
        return response.choices[0].message.content;
    }
    async evaluateAnswer(topic, rootQuestion, recentMessages, memorySummary, candidateAnswer) {
        const systemPrompt = `You are an experienced frontend interviewer.
Your responsibilities:
- evaluate candidate understanding
- ask natural follow-up questions
- identify missing concepts dynamically
- determine whether candidate understanding is sufficient
- detect confidence and uncertainty
- avoid repetitive probing

Rules:
- Ask ONE question at a time
- Stay within the current topic
- Ask deeper follow-up questions if understanding is partial
- If candidate clearly does not know: politely acknowledge and move to another question
- If candidate says: "I don't know", "That's all I know", "I'm not sure", avoid excessive probing

Your interview style should feel: natural, supportive, realistic, conversational.
You must return JSON according to this exact schema:
{
  "evaluation": {
    "technical_score": number (1-10),
    "communication_score": number (1-10),
    "confidence_score": number (1-10)
  },
  "analysis": {
    "understanding_level": "partial" | "full" | "none",
    "missing_areas": string[],
    "candidate_exhausted": boolean
  },
  "decision": {
    "action": "followup" | "move_next"
  },
  "next_message": string
}
`;
        const userPrompt = `Current topic: ${topic}
Main root question: "${rootQuestion}"

Recent conversation:
${recentMessages.map(m => m.role + ': ' + m.content).join('\n')}

Memory Summary:
${memorySummary ? JSON.stringify(memorySummary, null, 2) : 'None'}

Candidate latest answer:
"${candidateAnswer}"

Evaluate:
- answer quality
- understanding depth
- missing concepts
- whether follow-up is needed
- whether candidate exhausted their knowledge

Return structured JSON.`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0].message.content || '{}';
        return JSON.parse(content);
    }
    async generateMemorySummary(messages) {
        const prompt = `Based on the following interview conversation, generate a short summary of the candidate's performance so far, including their strengths and weaknesses. Return ONLY JSON according to this exact schema:
{
  "summary": string,
  "strengths": string[],
  "weaknesses": string[]
}

Conversation:
${messages.map(m => m.role + ': ' + m.content).join('\n')}
    `;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0].message.content || '{}';
        return JSON.parse(content);
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map