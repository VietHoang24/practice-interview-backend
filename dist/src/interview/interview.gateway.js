"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const ws_1 = require("ws");
const werift_1 = require("werift");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let InterviewGateway = class InterviewGateway {
    prisma;
    aiService;
    server;
    sessions = new Map();
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    handleConnection(client) {
        console.log('Client connected');
    }
    handleDisconnect(client) {
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
    async handleJoin(data, client) {
        const { sessionId, role, userId } = data;
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
    async handleOffer(data, client) {
        const { sessionId, offer } = data;
        const session = this.sessions.get(sessionId);
        if (session) {
            const peerConnection = new werift_1.RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            await peerConnection.setRemoteDescription(new werift_1.RTCSessionDescription(offer.sdp, offer.type));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            client.send(JSON.stringify({
                event: 'answer',
                data: {
                    answer: {
                        type: answer.type,
                        sdp: answer.sdp,
                    }
                }
            }));
            peerConnection.onTrack.subscribe((track) => {
                console.log(`Received track: ${track.kind}`);
                setTimeout(() => {
                    this.mockAiResponse(client, sessionId, session.role);
                }, 3000);
            });
            session.aiConnection = peerConnection;
        }
    }
    async handleIceCandidate(data) {
        const { sessionId, candidate } = data;
        const session = this.sessions.get(sessionId);
        if (session?.aiConnection && candidate) {
            try {
                await session.aiConnection.addIceCandidate(new werift_1.RTCIceCandidate(candidate));
            }
            catch (err) {
                console.error('Failed to add ICE candidate', err);
            }
        }
    }
    async mockAiResponse(client, sessionId, role) {
        try {
            const greeting = await this.aiService.getChatCompletion([{ role: 'user', content: 'Say a short professional greeting to start the interview.' }], `You are a senior technical interviewer for a ${role} position.`);
            await this.prisma.message.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: greeting || 'Hello, are you ready to begin?',
                }
            });
            client.send(JSON.stringify({
                event: 'chat',
                data: {
                    role: 'assistant',
                    content: greeting,
                }
            }));
        }
        catch (err) {
            console.error('AI Response error:', err);
        }
    }
};
exports.InterviewGateway = InterviewGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], InterviewGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_1.WebSocket]),
    __metadata("design:returntype", Promise)
], InterviewGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('offer'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_1.WebSocket]),
    __metadata("design:returntype", Promise)
], InterviewGateway.prototype, "handleOffer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ice-candidate'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InterviewGateway.prototype, "handleIceCandidate", null);
exports.InterviewGateway = InterviewGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ path: '/api/interview/signal' }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], InterviewGateway);
//# sourceMappingURL=interview.gateway.js.map