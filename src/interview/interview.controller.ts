import { Controller, Post, Body, Param, UseInterceptors, UploadedFile, BadRequestException, Get, Query, Put, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewService } from './interview.service';

@Controller('api/interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('start')
  async startInterview(
    @Body() body: { role: string; level: string; userId?: string; questionIds?: string[] }
  ) {
    return this.interviewService.startInterview(body.role, body.level, body.userId, body.questionIds);
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
    const text = await this.interviewService.transcribeAudio(file.buffer, file.originalname || 'audio.webm');
    return { text };
  }
}
