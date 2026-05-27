import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'werift';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@WebSocketGateway({ path: '/api/interview/signal' })
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private sessions = new Map<string, {
    sessionId: string;
    userId: string;
    role: string;
    userSocket: WebSocket;
    aiConnection?: RTCPeerConnection;
  }>();

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  handleConnection(client: WebSocket) {
    console.log('Client connected');
  }

  handleDisconnect(client: WebSocket) {
    // Cleanup sessions on disconnect
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userSocket === client) {
        if (session.aiConnection) {
          session.aiConnection.close();
        }
        this.sessions.delete(sessionId);
        console.log(`Session ${sessionId} closed`);
        break;
      }
    }
  }

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    const { sessionId, role, userId } = data;
    
    // Initialize or fetch session from DB
    await this.prisma.interviewSession.upsert({
      where: { sessionId },
      update: {},
      create: {
        sessionId,
        userId: userId || 'anonymous',
        role: role || 'frontend-developer',
        level: 'beginner',
      },
    });

    this.sessions.set(sessionId, {
      sessionId,
      userId: userId || 'anonymous',
      role,
      userSocket: client,
    });
    console.log(`Session ${sessionId} joined`);
  }

  @SubscribeMessage('offer')
  async handleOffer(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    const { sessionId, offer } = data;
    const session = this.sessions.get(sessionId);

    if (session) {
      // 1. Create AI's peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // 2. Create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer.sdp, offer.type as any));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // 3. Send answer back to user
      client.send(JSON.stringify({
        event: 'answer',
        data: {
          answer: {
            type: answer.type,
            sdp: answer.sdp,
          }
        }
      }));

      // 4. Setup track handlers
      peerConnection.onTrack.subscribe((track) => {
        console.log(`Received track: ${track.kind}`);
        // Audio streaming to OpenAI STT -> GPT -> TTS -> AudioTrack would happen here.
        // For now, we mock an initial greeting text chat message via WebSocket
        setTimeout(() => {
          this.mockAiResponse(client, sessionId, session.role);
        }, 3000);
      });

      session.aiConnection = peerConnection;
    }
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @MessageBody() data: any,
  ) {
    const { sessionId, candidate } = data;
    const session = this.sessions.get(sessionId);

    if (session?.aiConnection && candidate) {
      try {
        await session.aiConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (err) {
        console.error('Failed to add ICE candidate', err);
      }
    }
  }

  private async mockAiResponse(client: WebSocket, sessionId: string, role: string) {
    try {
      // Fetch some initial greeting from AI
      const greeting = await this.aiService.getChatCompletion(
        [{ role: 'user', content: 'Say a short professional greeting to start the interview.' }],
        `You are a senior technical interviewer for a ${role} position.`
      );

      // Save to DB
      await this.prisma.message.create({
        data: {
          sessionId,
          role: 'assistant',
          content: greeting || 'Hello, are you ready to begin?',
        }
      });

      // Send chat via websocket
      client.send(JSON.stringify({
        event: 'chat',
        data: {
          role: 'assistant',
          content: greeting,
        }
      }));
    } catch (err) {
      console.error('AI Response error:', err);
    }
  }
}
