import { Test, TestingModule } from '@nestjs/testing';
import { InterviewGateway } from './interview.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

describe('InterviewGateway', () => {
  let gateway: InterviewGateway;

  const mockPrismaService = {
    interviewSession: {
      upsert: jest.fn(),
    },
  };

  const mockAiService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewGateway,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    gateway = module.get<InterviewGateway>(InterviewGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

