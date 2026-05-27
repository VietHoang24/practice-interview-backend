import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
export declare class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private prisma;
    private aiService;
    server: Server;
    private sessions;
    constructor(prisma: PrismaService, aiService: AiService);
    handleConnection(client: WebSocket): void;
    handleDisconnect(client: WebSocket): void;
    handleJoin(data: any, client: WebSocket): Promise<void>;
    handleOffer(data: any, client: WebSocket): Promise<void>;
    handleIceCandidate(data: any): Promise<void>;
    private mockAiResponse;
}
