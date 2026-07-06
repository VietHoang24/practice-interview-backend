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
exports.InterviewController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const interview_service_1 = require("./interview.service");
let InterviewController = class InterviewController {
    interviewService;
    constructor(interviewService) {
        this.interviewService = interviewService;
    }
    async startInterview(body) {
        return this.interviewService.startInterview(body.role, body.level, body.userId, body.questionIds, body.language);
    }
    async getTemplates(role, level) {
        return this.interviewService.getTemplates(role, level);
    }
    async getQuestions(templateId) {
        return this.interviewService.getQuestions(templateId);
    }
    async createQuestion(body) {
        return this.interviewService.createQuestion(body);
    }
    async updateQuestion(id, body) {
        return this.interviewService.updateQuestion(id, body);
    }
    async deleteQuestion(id) {
        return this.interviewService.deleteQuestion(id);
    }
    async submitAnswer(sessionId, body) {
        console.log(`[Backend Controller] Received submitAnswer request for session ${sessionId}: "${body.answer}"`);
        return this.interviewService.processAnswer(sessionId, body.answer);
    }
    async transcribeAudio(sessionId, file) {
        if (!file) {
            throw new common_1.BadRequestException('No audio file uploaded');
        }
        console.log(`[Backend Controller] Received audio file for transcription in session ${sessionId}: filename=${file.originalname || 'audio.webm'}, size=${file.size} bytes`);
        const text = await this.interviewService.transcribeAudio(file.buffer, file.originalname || 'audio.webm');
        console.log(`[Backend Controller] Transcribed audio output text: "${text}"`);
        return { text };
    }
    async createRealtimeSession(sessionId, body) {
        console.log(`[Backend Controller] Received request to generate WebRTC Realtime ephemeral token for session ${sessionId} (language: ${body?.language || 'vi-VN'})`);
        const result = await this.interviewService.createRealtimeSessionToken(sessionId, body?.language);
        console.log(`[Backend Controller] Ephemeral token generated successfully for session ${sessionId}`);
        return result;
    }
    async evaluateTurn(sessionId, body) {
        console.log(`[Backend Controller] Received evaluate-turn request for session ${sessionId}: "${body.userText}"`);
        return this.interviewService.evaluateTurn(sessionId, body.questionText, body.userText, body.language);
    }
    async logMessage(sessionId, body) {
        console.log(`[Backend Console Log] ${body.role.toUpperCase()}: "${body.content}" (Session: ${sessionId})`);
        return { status: 'success' };
    }
    async skipIntro(sessionId, body) {
        return this.interviewService.skipIntro(sessionId, body?.language);
    }
    async getInstructions(sessionId, body) {
        return this.interviewService.getInstructions(sessionId, body.language);
    }
};
exports.InterviewController = InterviewController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "startInterview", null);
__decorate([
    (0, common_1.Get)('templates'),
    __param(0, (0, common_1.Query)('role')),
    __param(1, (0, common_1.Query)('level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)('questions'),
    __param(0, (0, common_1.Query)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "getQuestions", null);
__decorate([
    (0, common_1.Post)('questions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "createQuestion", null);
__decorate([
    (0, common_1.Put)('questions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "updateQuestion", null);
__decorate([
    (0, common_1.Delete)('questions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "deleteQuestion", null);
__decorate([
    (0, common_1.Post)(':sessionId/answer'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "submitAnswer", null);
__decorate([
    (0, common_1.Post)(':sessionId/transcribe'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "transcribeAudio", null);
__decorate([
    (0, common_1.Post)(':sessionId/realtime-session'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "createRealtimeSession", null);
__decorate([
    (0, common_1.Post)(':sessionId/evaluate-turn'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "evaluateTurn", null);
__decorate([
    (0, common_1.Post)(':sessionId/log-message'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "logMessage", null);
__decorate([
    (0, common_1.Post)(':sessionId/skip-intro'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "skipIntro", null);
__decorate([
    (0, common_1.Post)(':sessionId/instructions'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InterviewController.prototype, "getInstructions", null);
exports.InterviewController = InterviewController = __decorate([
    (0, common_1.Controller)('api/interviews'),
    __metadata("design:paramtypes", [interview_service_1.InterviewService])
], InterviewController);
//# sourceMappingURL=interview.controller.js.map