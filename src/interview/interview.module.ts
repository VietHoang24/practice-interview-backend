import { Module } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewGateway } from './interview.gateway';
import { InterviewController } from './interview.controller';

@Module({
  controllers: [InterviewController],
  providers: [InterviewService, InterviewGateway]
})
export class InterviewModule {}
