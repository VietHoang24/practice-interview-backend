import { Test, TestingModule } from '@nestjs/testing';
import { InterviewService } from './interview.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotFoundException } from '@nestjs/common';

describe('InterviewService', () => {
  let service: InterviewService;
  let prisma: any;
  let aiService: any;

  const mockPrismaService = {
    interviewSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    interviewQuestion: {
      findMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    interviewMemory: {
      findUnique: jest.fn(),
    },
    interviewEvaluation: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockAiService = {
    evaluateAnswer: jest.fn(),
    generateMemorySummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<InterviewService>(InterviewService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAnswer - consecutive failures', () => {
    const sessionId = 'test-session-id';
    const mockSession = {
      sessionId,
      role: 'frontend',
      level: 'junior',
      currentQuestionIndex: 0,
      status: 'active',
      questionIds: ['q1', 'q2'],
    };
    const mockQuestions = [
      { id: 'q1', topic: 'react', question: 'What is re-render?', orderIndex: 1 },
      { id: 'q2', topic: 'react', question: 'What is useEffect?', orderIndex: 2 },
    ];

    beforeEach(() => {
      prisma.interviewSession.findUnique.mockResolvedValue(mockSession);
      prisma.interviewQuestion.findMany.mockResolvedValue(mockQuestions);
      prisma.message.create.mockImplementation((args) => Promise.resolve({ id: 'msg-id', ...args.data }));
      prisma.message.findMany.mockResolvedValue([]);
      prisma.message.count.mockResolvedValue(1);
      prisma.interviewMemory.findUnique.mockResolvedValue(null);
      prisma.interviewMemory.upsert = jest.fn().mockResolvedValue({});
      aiService.generateMemorySummary.mockResolvedValue({
        summary: 'Good start',
        strengths: ['react'],
        weaknesses: [],
      });
    });

    it('should stay on same question (action followup) if answer is good', async () => {
      aiService.evaluateAnswer.mockResolvedValue({
        evaluation: { technical_score: 8, communication_score: 8, confidence_score: 8 },
        analysis: { understanding_level: 'full', missing_areas: [], candidate_exhausted: false },
        decision: { action: 'followup' },
        next_message: 'Can you optimize it?',
      });

      prisma.interviewEvaluation.create.mockResolvedValue({ id: 'eval-1' });
      prisma.interviewEvaluation.findMany.mockResolvedValue([
        {
          id: 'eval-1',
          sessionId,
          questionId: 'q1',
          technicalScore: 8,
          communicationScore: 8,
          confidenceScore: 8,
          feedback: JSON.stringify({ understanding_level: 'full', candidate_exhausted: false }),
        },
      ]);

      const result: any = await service.processAnswer(sessionId, 'React renders when state changes.');

      expect(result.action).toBe('followup');
      expect(result.message.content).toBe('Can you optimize it?');
      expect(prisma.interviewSession.update).not.toHaveBeenCalled();
    });

    it('should force move_next when there are 2 consecutive failed evaluations (technicalScore <= 3) under same question', async () => {
      aiService.evaluateAnswer.mockResolvedValue({
        evaluation: { technical_score: 2, communication_score: 4, confidence_score: 3 },
        analysis: { understanding_level: 'none', missing_areas: ['react render'], candidate_exhausted: false },
        decision: { action: 'followup' }, // AI wants to followup
        next_message: 'What triggers re-rendering?',
      });

      prisma.interviewEvaluation.create.mockResolvedValue({ id: 'eval-2' });
      // Mocking 2 consecutive failed evaluations for same questionId 'q1'
      prisma.interviewEvaluation.findMany.mockResolvedValue([
        {
          id: 'eval-2',
          sessionId,
          questionId: 'q1',
          technicalScore: 2,
          communicationScore: 4,
          confidenceScore: 3,
          feedback: JSON.stringify({ understanding_level: 'none', candidate_exhausted: false }),
        },
        {
          id: 'eval-1',
          sessionId,
          questionId: 'q1',
          technicalScore: 3,
          communicationScore: 4,
          confidenceScore: 3,
          feedback: JSON.stringify({ understanding_level: 'partial', candidate_exhausted: false }),
        },
      ]);

      const result: any = await service.processAnswer(sessionId, 'I do not know.');

      // Should override decision to move_next
      expect(result.action).toBe('move_next');
      expect(result.message.content).toContain("No worries, let's move on to the next topic.");
      expect(result.message.content).toContain("What is useEffect?");
      expect(prisma.interviewSession.update).toHaveBeenCalledWith({
        where: { sessionId },
        data: { currentQuestionIndex: 1 },
      });
    });

    it('should force move_next when there are 2 consecutive failed evaluations (understanding_level none) under same question', async () => {
      aiService.evaluateAnswer.mockResolvedValue({
        evaluation: { technical_score: 0, communication_score: 4, confidence_score: 3 },
        analysis: { understanding_level: 'none', missing_areas: [], candidate_exhausted: false },
        decision: { action: 'followup' },
        next_message: 'Can you try again?',
      });

      prisma.interviewEvaluation.create.mockResolvedValue({ id: 'eval-2' });
      prisma.interviewEvaluation.findMany.mockResolvedValue([
        {
          id: 'eval-2',
          sessionId,
          questionId: 'q1',
          technicalScore: 0,
          communicationScore: 4,
          confidenceScore: 3,
          feedback: JSON.stringify({ understanding_level: 'none', candidate_exhausted: false }),
        },
        {
          id: 'eval-1',
          sessionId,
          questionId: 'q1',
          technicalScore: 0,
          communicationScore: 4,
          confidenceScore: 3,
          feedback: JSON.stringify({ understanding_level: 'none', candidate_exhausted: false }),
        },
      ]);

      const result: any = await service.processAnswer(sessionId, 'No idea.');

      expect(result.action).toBe('move_next');
      expect(result.message.content).toContain("No worries, let's move on to the next topic.");
      expect(prisma.interviewSession.update).toHaveBeenCalledWith({
        where: { sessionId },
        data: { currentQuestionIndex: 1 },
      });
    });

    it('should force move_next on first failure', async () => {
      aiService.evaluateAnswer.mockResolvedValue({
        evaluation: { technical_score: 2, communication_score: 4, confidence_score: 3 },
        analysis: { understanding_level: 'none', missing_areas: [], candidate_exhausted: false },
        decision: { action: 'followup' },
        next_message: 'Let us try another angle.',
      });

      const result = await service.processAnswer(sessionId, 'I do not know.');

      expect(result.action).toBe('move_next');
      expect(prisma.interviewSession.update).toHaveBeenCalledWith({
        where: { sessionId },
        data: { currentQuestionIndex: 1 },
      });
    });

    it('should force move_next when assistant messages count reaches 3 (probing cap)', async () => {
      prisma.message.count.mockResolvedValue(3);
      aiService.evaluateAnswer.mockResolvedValue({
        evaluation: { technical_score: 8, communication_score: 8, confidence_score: 8 },
        analysis: { understanding_level: 'full', missing_areas: [], candidate_exhausted: false },
        decision: { action: 'followup' },
        next_message: 'Let us try another angle.',
      });

      const result = await service.processAnswer(sessionId, 'React renders when state changes.');

      expect(result.action).toBe('move_next');
      expect(prisma.interviewSession.update).toHaveBeenCalledWith({
        where: { sessionId },
        data: { currentQuestionIndex: 1 },
      });
    });
  });
});
