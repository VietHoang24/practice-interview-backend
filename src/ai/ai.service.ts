import { Injectable } from '@nestjs/common';
import OpenAI, { toFile } from 'openai';

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

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
    try {
      const file = await toFile(buffer, filename);
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      return response.text;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  async getChatCompletion(messages: OpenAI.Chat.ChatCompletionMessageParam[], systemPrompt?: string) {
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
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

  async evaluateAnswer(
    topic: string,
    rootQuestion: string,
    recentMessages: any[],
    memorySummary: any,
    candidateAnswer: string,
  ): Promise<EvaluationResult> {
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
      model: 'gpt-4o', // using a smarter model for structured JSON
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as EvaluationResult;
  }

  async generateMemorySummary(messages: any[]): Promise<MemorySummary> {
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
    return JSON.parse(content) as MemorySummary;
  }
}
