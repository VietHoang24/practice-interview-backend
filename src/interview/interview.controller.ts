import { Controller, Post, Body, Param, UseInterceptors, UploadedFile, BadRequestException, Get, Query, Put, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewService } from './interview.service';

@Controller('api/interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('start')
  async startInterview(
    @Body() body: { role: string; level: string; userId?: string; questionIds?: string[]; language?: string }
  ) {
    return this.interviewService.startInterview(body.role, body.level, body.userId, body.questionIds, body.language);
  }

  @Get('templates')
  async getTemplates(
    @Query('role') role?: string,
    @Query('level') level?: string,
  ) {
    return this.interviewService.getTemplates(role, level);
  }

  @Get('questions')
  async getQuestions(
    @Query('templateId') templateId?: string,
  ) {
    return this.interviewService.getQuestions(templateId);
  }

  @Post('questions')
  async createQuestion(
    @Body() body: { role: string; level: string; topic: string; question: string; difficulty: number; orderIndex: number; templateId?: string }
  ) {
    return this.interviewService.createQuestion(body);
  }

  @Put('questions/:id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() body: { topic?: string; question?: string; difficulty?: number; orderIndex?: number }
  ) {
    return this.interviewService.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  async deleteQuestion(
    @Param('id') id: string,
  ) {
    return this.interviewService.deleteQuestion(id);
  }

  @Post(':sessionId/answer')
  async submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: { answer: string }
  ) {
    console.log(`[Backend Controller] Received submitAnswer request for session ${sessionId}: "${body.answer}"`);
    return this.interviewService.processAnswer(sessionId, body.answer);
  }

  @Post(':sessionId/transcribe')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file uploaded');
    }
    console.log(`[Backend Controller] Received audio file for transcription in session ${sessionId}: filename=${file.originalname || 'audio.webm'}, size=${file.size} bytes`);
    const text = await this.interviewService.transcribeAudio(file.buffer, file.originalname || 'audio.webm');
    console.log(`[Backend Controller] Transcribed audio output text: "${text}"`);
    return { text };
  }

  @Post(':sessionId/realtime-session')
  async createRealtimeSession(
    @Param('sessionId') sessionId: string,
    @Body() body?: { language?: string }
  ) {
    console.log(`[Backend Controller] Received request to generate WebRTC Realtime ephemeral token for session ${sessionId} (language: ${body?.language || 'vi-VN'})`);
    const result = await this.interviewService.createRealtimeSessionToken(sessionId, body?.language);
    console.log(`[Backend Controller] Ephemeral token generated successfully for session ${sessionId}`);
    return result;
  }

  @Post(':sessionId/evaluate-turn')
  async evaluateTurn(
    @Param('sessionId') sessionId: string,
    @Body() body: { questionText: string; userText: string; language?: string }
  ) {
    console.log(`[Backend Controller] Received evaluate-turn request for session ${sessionId}: "${body.userText}"`);
    return this.interviewService.evaluateTurn(sessionId, body.questionText, body.userText, body.language);
  }

  @Post(':sessionId/log-message')
  async logMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { role: string; content: string }
  ) {
    console.log(`[Backend Console Log] ${body.role.toUpperCase()}: "${body.content}" (Session: ${sessionId})`);
    return { status: 'success' };
  }

  @Post(':sessionId/skip-intro')
  async skipIntro(
    @Param('sessionId') sessionId: string,
    @Body() body?: { language?: string }
  ) {
    return this.interviewService.skipIntro(sessionId, body?.language);
  }

  @Post(':sessionId/instructions')
  async getInstructions(
    @Param('sessionId') sessionId: string,
    @Body() body: { language: string }
  ) {
    return this.interviewService.getInstructions(sessionId, body.language);
  }
}
