import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_TEMPLATES } from './templates';

@Injectable()
export class InterviewService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async startInterview(role: string, level: string, userId: string = 'anonymous', questionIds?: string[], language: string = 'en-US') {
    const sessionId = uuidv4();
    
    let questions: any[] = [];
    if (questionIds && questionIds.length > 0) {
      questions = await this.prisma.interviewQuestion.findMany({
        where: { id: { in: questionIds } },
      });
      // Sort questions to preserve the user's customized order
      questions.sort((a, b) => questionIds.indexOf(a.id) - questionIds.indexOf(b.id));
    } else {
      // Load templates for this role and level ordered by name
      const templates = await this.prisma.questionTemplate.findMany({
        where: { role: role.toLowerCase(), level: level.toLowerCase() },
        orderBy: { name: 'asc' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });
      questions = templates.flatMap(t => t.questions);

      // Fallback if no templates found
      if (!questions.length) {
        questions = await this.prisma.interviewQuestion.findMany({
          where: { role: role.toLowerCase(), level: level.toLowerCase() },
          orderBy: [
            { templateId: 'asc' },
            { orderIndex: 'asc' }
          ],
        });
      }
    }

    if (!questions.length) {
      throw new NotFoundException('No questions found for this role and level');
    }

    // Create session with stored questionIds
    const session = await this.prisma.interviewSession.create({
      data: {
        sessionId,
        userId,
        role,
        level,
        currentQuestionIndex: -1, // Start with self-introduction phase (-1)
        questionIds: questions.map(q => q.id),
      },
    });

    const firstQuestion = questions[0];
    const greetingText = language === 'vi-VN'
      ? `Chào bạn, rất vui được gặp bạn trong buổi phỏng vấn hôm nay. Trước khi bắt đầu với các câu hỏi chính, mình muốn dành một chút thời gian để hiểu thêm về bạn và kinh nghiệm làm việc của bạn.

Bạn có muốn giới thiệu ngắn gọn về bản thân, kinh nghiệm làm việc và những điểm nổi bật trong sự nghiệp của mình không?`
      : `Hello, nice to meet you. Welcome to your interview today. Before we dive into the technical questions, I'd like to take a moment to learn a bit more about you and your background.

Would you mind introducing yourself briefly, including your experience and some of the highlights of your career?`;

    // Create the first AI message (Self-Introduction Prompt)
    const initialAiMessage = await this.prisma.message.create({
      data: {
        sessionId,
        questionId: 'intro',
        role: 'assistant',
        content: greetingText,
      },
    });

    return {
      sessionId,
      question: firstQuestion,
      message: initialAiMessage,
    };
  }

  async processAnswer(sessionId: string, answer: string) {
    console.log(`[Backend] User transcript (processAnswer) for session ${sessionId}: "${answer}"`);
    const session = await this.prisma.interviewSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Load the exact questions for this session in the stored order
    const sessionQuestionIds = session.questionIds || [];
    let questions: any[] = [];
    if (sessionQuestionIds.length > 0) {
      questions = await this.prisma.interviewQuestion.findMany({
        where: { id: { in: sessionQuestionIds } },
      });
      // Sort to match the stored order
      questions.sort((a, b) => sessionQuestionIds.indexOf(a.id) - sessionQuestionIds.indexOf(b.id));
    } else {
      // Fallback in case questionIds is empty (for backward compatibility with old sessions)
      const templates = await this.prisma.questionTemplate.findMany({
        where: { role: session.role.toLowerCase(), level: session.level.toLowerCase() },
        orderBy: { name: 'asc' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } }
      });
      questions = templates.flatMap(t => t.questions);

      if (!questions.length) {
        questions = await this.prisma.interviewQuestion.findMany({
          where: { role: session.role, level: session.level },
          orderBy: [
            { templateId: 'asc' },
            { orderIndex: 'asc' }
          ],
        });
      }
    }

    if (session.currentQuestionIndex >= questions.length) {
      return { status: 'completed', message: 'Interview has concluded.' };
    }

    const currentQuestion = questions[session.currentQuestionIndex];

    // Save the user's answer
    await this.prisma.message.create({
      data: {
        sessionId,
        questionId: currentQuestion.id,
        role: 'user',
        content: answer,
      },
    });

    // Load recent messages for this question
    const recentMessages = await this.prisma.message.findMany({
      where: { sessionId, questionId: currentQuestion.id },
      orderBy: { createdAt: 'asc' },
    });

    // Load memory summary
    const memory = await this.prisma.interviewMemory.findUnique({
      where: { sessionId },
    });

    // Call AI to evaluate answer
    const aiResponse = await this.aiService.evaluateAnswer(
      currentQuestion.topic,
      currentQuestion.question,
      recentMessages,
      memory,
      answer,
    );

    // Save evaluation
    await this.prisma.interviewEvaluation.create({
      data: {
        sessionId,
        questionId: currentQuestion.id,
        technicalScore: aiResponse.evaluation.technical_score || 0,
        communicationScore: aiResponse.evaluation.communication_score || 0,
        confidenceScore: aiResponse.evaluation.confidence_score || 0,
        feedback: JSON.stringify(aiResponse.analysis),
      },
    });

    // Check for 2 consecutive failures under the current root question
    const recentEvaluations = await this.prisma.interviewEvaluation.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    let isConsecutiveFailures = false;
    if (recentEvaluations.length >= 2) {
      const currentEval = recentEvaluations[0];
      const prevEval = recentEvaluations[1];
      if (currentEval.questionId === prevEval.questionId) {
        const currentFailed = this.isFailedEvaluation(currentEval);
        const prevFailed = this.isFailedEvaluation(prevEval);
        if (currentFailed && prevFailed) {
          isConsecutiveFailures = true;
        }
      }
    }

    // Count how many assistant messages have been sent for this question
    const assistantMessagesCount = await this.prisma.message.count({
      where: { sessionId, questionId: currentQuestion.id, role: 'assistant' },
    });

    const isCurrentFailed = this.isFailedEvaluation({
      technicalScore: aiResponse.evaluation.technical_score,
      communicationScore: aiResponse.evaluation.communication_score,
      confidenceScore: aiResponse.evaluation.confidence_score,
      feedback: JSON.stringify(aiResponse.analysis),
    });

    let newQuestionIndex = session.currentQuestionIndex;
    const shouldMoveNext = 
      aiResponse.decision.action === 'move_next' || 
      aiResponse.analysis.candidate_exhausted || 
      isConsecutiveFailures ||
      assistantMessagesCount >= 3 ||
      isCurrentFailed;

    let nextContent = aiResponse.next_message;

    // Decision logic
    if (shouldMoveNext) {
      newQuestionIndex += 1;
      
      // Check if there are more questions
      if (newQuestionIndex < questions.length) {
        const nextRootQuestion = questions[newQuestionIndex];
        if (isConsecutiveFailures && aiResponse.decision.action !== 'move_next') {
          nextContent = `No worries, let's move on to the next topic.\n\n${nextRootQuestion.question}`;
        } else {
          nextContent = aiResponse.next_message ? `${aiResponse.next_message}\n\n${nextRootQuestion.question}` : nextRootQuestion.question;
        }
      } else {
        if (isConsecutiveFailures && aiResponse.decision.action !== 'move_next') {
          nextContent = `No worries, let's wrap up here.\n\nThat concludes our interview. Thank you!`;
        } else {
          nextContent = aiResponse.next_message ? `${aiResponse.next_message}\n\nThat concludes our interview. Thank you!` : "That concludes our interview. Thank you!";
        }
        await this.prisma.interviewSession.update({
          where: { sessionId },
          data: { status: 'completed' }
        });
      }

      // Update session with new question index
      await this.prisma.interviewSession.update({
        where: { sessionId },
        data: { currentQuestionIndex: newQuestionIndex },
      });

      // After a topic finishes, generate a new memory summary
      this.updateMemory(sessionId).catch(err => console.error('Failed to update memory:', err));
    }

    // Save AI response message
    const assistantMessage = await this.prisma.message.create({
      data: {
        sessionId,
        questionId: newQuestionIndex < questions.length ? questions[newQuestionIndex].id : currentQuestion.id,
        role: 'assistant',
        content: nextContent,
      },
    });

    return {
      action: shouldMoveNext ? 'move_next' : aiResponse.decision.action,
      evaluation: aiResponse.evaluation,
      analysis: aiResponse.analysis,
      message: assistantMessage,
      status: newQuestionIndex >= questions.length ? 'completed' : 'ongoing',
    };
  }

  private isFailedEvaluation(evaluation: any): boolean {
    if (!evaluation) return false;
    
    // Technical score is 3 or less (out of 10)
    if (evaluation.technicalScore <= 3) {
      return true;
    }

    
    // Check feedback structure for understanding_level or candidate_exhausted
    try {
      const feedbackObj = typeof evaluation.feedback === 'string'
        ? JSON.parse(evaluation.feedback)
        : evaluation.feedback;
      if (feedbackObj && (feedbackObj.understanding_level === 'none' || feedbackObj.candidate_exhausted === true)) {
        return true;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    
    return false;
  }

  private async updateMemory(sessionId: string) {
    const messages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const summaryResult = await this.aiService.generateMemorySummary(messages);

    await this.prisma.interviewMemory.upsert({
      where: { sessionId },
      update: {
        summary: summaryResult.summary || 'No summary provided',
        strengths: summaryResult.strengths || [],
        weaknesses: summaryResult.weaknesses || [],
      },
      create: {
        sessionId,
        summary: summaryResult.summary || 'No summary provided',
        strengths: summaryResult.strengths || [],
        weaknesses: summaryResult.weaknesses || [],
      },
    });
  }

  async transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
    const text = await this.aiService.transcribeAudio(buffer, filename);
    console.log(`[Backend] Transcribed audio to text: "${text}"`);
    return text;
  }

  async getTemplates(role?: string, level?: string) {
    const where: any = {};
    if (role) where.role = role.toLowerCase();
    if (level) where.level = level.toLowerCase();

    let templates = await this.prisma.questionTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    });

    // Auto-seed templates and questions if empty and role & level are provided
    if (templates.length === 0 && role && level) {
      const rKey = role.toLowerCase();
      const lKey = level.toLowerCase();
      const templateDefs = MOCK_TEMPLATES[rKey]?.[lKey];
      if (templateDefs && templateDefs.length > 0) {
        console.log(`Auto-seeding templates and questions for ${rKey} - ${lKey}...`);
        for (const tDef of templateDefs) {
          const createdTemplate = await this.prisma.questionTemplate.create({
            data: {
              name: tDef.name,
              description: tDef.description,
              role: rKey,
              level: lKey,
            }
          });

          await Promise.all(
            tDef.questions.map((q) =>
              this.prisma.interviewQuestion.create({
                data: {
                  role: rKey,
                  level: lKey,
                  topic: q.topic,
                  question: q.question,
                  difficulty: q.difficulty,
                  orderIndex: q.orderIndex,
                  templateId: createdTemplate.id,
                },
              })
            )
          );
        }

        // Query again to get seeded templates with questions
        templates = await this.prisma.questionTemplate.findMany({
          where,
          orderBy: { name: 'asc' },
          include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
      }
    }

    return templates;
  }

  async getQuestions(templateId?: string) {
    const where: any = {};
    if (templateId) {
      where.templateId = templateId;
    }

    return this.prisma.interviewQuestion.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createQuestion(data: { role: string; level: string; topic: string; question: string; difficulty: number; orderIndex: number; templateId?: string }) {
    return this.prisma.interviewQuestion.create({
      data: {
        role: data.role.toLowerCase(),
        level: data.level.toLowerCase(),
        topic: data.topic,
        question: data.question,
        difficulty: data.difficulty,
        orderIndex: data.orderIndex,
        templateId: data.templateId,
      },
    });
  }

  async updateQuestion(id: string, data: { topic?: string; question?: string; difficulty?: number; orderIndex?: number }) {
    return this.prisma.interviewQuestion.update({
      where: { id },
      data,
    });
  }

  async deleteQuestion(id: string) {
    return this.prisma.interviewQuestion.delete({
      where: { id },
    });
  }

  async getInstructions(sessionId: string, language: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isEn = language === 'en-US';

    // Load session questions to feed them directly to the AI
    const sessionQuestionIds = session.questionIds || [];
    let questions: any[] = [];
    if (sessionQuestionIds.length > 0) {
      questions = await this.prisma.interviewQuestion.findMany({
        where: { id: { in: sessionQuestionIds } },
      });
      questions.sort((a, b) => sessionQuestionIds.indexOf(a.id) - sessionQuestionIds.indexOf(b.id));
    }

    const questionsListStr = questions.map((q, idx) => {
      return `- Question ${idx + 1}: [Topic: ${q.topic}] ${q.question}`;
    }).join('\n');

    const instructions = isEn
      ? `You are a professional mock interviewer.
Your task is to conduct a technical interview for the position of a ${session.role} (${session.level} level).
The interview must be conducted entirely in English.

The technical questions you MUST ask in this interview are:
${questionsListStr}

The interview will follow this flow:
1. Introduction (Greeting and proposing self-introduction):
   - Start with a warm greeting: "Hello, nice to meet you in today's interview. Before we start with the technical questions, I'd like to take a moment to learn more about you and your background."
   - Propose self-introduction: "Would you like to briefly introduce yourself, your work experience, and your career highlights?"

2. Handling Candidate's Self-Introduction:
   - Listen to the candidate's self-introduction and identify key details.
   - Do not jump immediately to the main questions. Ask 1-3 natural follow-up questions to dive deeper into the experience, projects, challenges, or achievements they just shared.
   - After completing the follow-up questions, transition naturally to the main questions: "Thank you for sharing. This really helps me understand your background and experience better. Now, let's move on to the main questions of the interview." and proceed to the first technical question.

3. Main Technical Questions:
   - Ask the technical questions in the exact order listed above.
   - For each technical question:
     a. Start by asking the main question text.
     b. You can ask up to 2 follow-up questions to probe the candidate's understanding if they provide a partial answer.
     c. If they cannot answer, say they do not know, or if you receive a system message to transition (e.g. "move_next"), transition to the next question immediately. Do not keep probing.

4. Handling Skip:
   - If the candidate says "skip", "bypass", "go to main questions", or clicks the Skip button on the screen (you will receive a text notification), respect their choice.
   - Reply briefly: "No problem, we will skip the introduction and go straight to the main questions." and proceed immediately to the first technical question.

General Rules:
- Speak conversationally like a real human interviewer.
- Ask concise interview questions, one at a time. Do not ask multiple questions at once.
- Keep latency low. Keep responses short and conversational.`
      : `You are a professional mock interviewer.
Your task is to conduct a technical interview for the position of a ${session.role} (${session.level} level).

Các câu hỏi kỹ thuật bạn BẮT BUỘC phải hỏi trong buổi phỏng vấn này là:
${questionsListStr}

Lưu ý quan trọng: Các câu hỏi trên được viết bằng tiếng Anh. Hãy dịch câu hỏi sang tiếng Việt một cách tự nhiên và trôi chảy khi hỏi ứng viên.

Buổi phỏng vấn sẽ đi theo flow sau:
1. Mở đầu buổi phỏng vấn (Chào hỏi và đề xuất giới thiệu bản thân):
   - Hãy bắt đầu bằng lời chào thân thiện: "Chào bạn, rất vui được gặp bạn trong buổi phỏng vấn hôm nay. Trước khi bắt đầu với các câu hỏi chính, mình muốn dành một chút thời gian để hiểu thêm về bạn và kinh nghiệm làm việc của bạn."
   - Đề xuất giới thiệu bản thân: "Bạn có muốn giới thiệu ngắn gọn về bản thân, kinh nghiệm làm việc và những điểm nổi bật trong sự nghiệp của mình không?"

2. Xử lý trường hợp ứng viên chọn giới thiệu bản thân:
   - Lắng nghe ứng viên giới thiệu và phân tích các thông tin quan trọng.
   - Không chuyển ngay sang câu hỏi chính, hãy đặt thêm 1-3 câu hỏi follow-up tự nhiên để đào sâu vào những kinh nghiệm, dự án, thách thức hay thành tựu mà họ vừa chia sẻ.
   - Sau khi hoàn thành phần follow-up, chuyển tiếp tự nhiên sang câu hỏi chính: "Cảm ơn bạn đã chia sẻ. Những thông tin này giúp mình hiểu rõ hơn về nền tảng và kinh nghiệm của bạn. Bây giờ mình sẽ chuyển sang phần câu hỏi chính của buổi phỏng vấn." và đi vào câu hỏi chính đầu tiên.

3. Các câu hỏi kỹ thuật chính:
   - Hỏi các câu hỏi kỹ thuật theo đúng thứ tự danh sách ở trên (dịch sang tiếng Việt).
   - Với mỗi câu hỏi kỹ thuật:
     a. Bắt đầu bằng việc hỏi câu hỏi chính.
     b. Bạn có thể hỏi tối đa 2 câu hỏi đào sâu (follow-up) để kiểm tra kỹ hơn nếu ứng viên trả lời chưa đầy đủ.
     c. Nếu ứng viên không trả lời được, nói không biết, hoặc nếu bạn nhận được tin nhắn hệ thống yêu cầu chuyển câu hỏi (move_next), hãy chuyển sang câu hỏi tiếp theo ngay lập tức. Không đào sâu thêm.

4. Xử lý trường hợp ứng viên chọn skip:
   - Nếu ứng viên nói "skip", "bỏ qua", "đi tiếp", "vào câu hỏi chính luôn" hoặc click nút Skip trên màn hình (bạn sẽ nhận được text thông báo), hãy tôn trọng lựa chọn đó.
   - Phản hồi ngắn gọn: "Không vấn đề gì, mình sẽ bỏ qua phần giới thiệu và đi thẳng vào phần câu hỏi chính." và đi ngay vào câu hỏi chính đầu tiên.

Nguyên tắc chung:
- Speak conversationally like a real human interviewer.
- Ask concise interview questions, one at a time. Do not ask multiple questions at once.
- Keep latency low. Keep responses short and conversational.`;

    return { instructions };
  }

  async createRealtimeSessionToken(sessionId: string, language?: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const { instructions } = await this.getInstructions(sessionId, language || 'vi-VN');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-mini-realtime-preview',
            instructions: instructions,
            audio: {
              input: {
                transcription: {
                  model: 'whisper-1',
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.85,
                  prefix_padding_ms: 500,
                  silence_duration_ms: 2000,
                  create_response: false,
                },
              },
            },
          }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('OpenAI Realtime session error:', errText);
        throw new Error(`Failed to create OpenAI Realtime session: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating realtime session token:', error);
      throw error;
    }
  }

  async evaluateTurn(sessionId: string, questionText: string, userText: string, language?: string) {
    console.log(`[Backend] User transcript (evaluateTurn) for session ${sessionId}: "${userText}"`);
    const session = await this.prisma.interviewSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Load session questions
    const sessionQuestionIds = session.questionIds || [];
    let questions: any[] = [];
    if (sessionQuestionIds.length > 0) {
      questions = await this.prisma.interviewQuestion.findMany({
        where: { id: { in: sessionQuestionIds } },
      });
      questions.sort((a, b) => sessionQuestionIds.indexOf(a.id) - sessionQuestionIds.indexOf(b.id));
    }

    const firstQuestion = questions[0];
    const currentQuestionId = session.currentQuestionIndex === -1 
      ? 'intro' 
      : (questions[session.currentQuestionIndex]?.id || 'unknown_question');

    const isEn = language === 'en-US';

    // 1. Ensure the actual AI question is saved in the database before saving the user response.
    if (session.currentQuestionIndex === -1) {
      // Update the pre-seeded greeting message content to match the actual spoken greeting
      const firstIntroMessage = await this.prisma.message.findFirst({
        where: { sessionId, questionId: 'intro', role: 'assistant' },
        orderBy: { createdAt: 'asc' },
      });
      if (firstIntroMessage) {
        await this.prisma.message.update({
          where: { id: firstIntroMessage.id },
          data: { content: questionText },
        });
      } else {
        await this.prisma.message.create({
          data: {
            sessionId,
            questionId: 'intro',
            role: 'assistant',
            content: questionText,
          },
        });
      }
    } else {
      const lastMessage = await this.prisma.message.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastMessage || lastMessage.content !== questionText) {
        await this.prisma.message.create({
          data: {
            sessionId,
            questionId: currentQuestionId,
            role: 'assistant',
            content: questionText,
          },
        });
      }
    }

    // 2. Save the user's answer message
    await this.prisma.message.create({
      data: {
        sessionId,
        questionId: currentQuestionId,
        role: 'user',
        content: userText,
      },
    });

    // Handle Self-Introduction Phase (-1)
    if (session.currentQuestionIndex === -1) {
      const userTextClean = userText.toLowerCase().trim();
      const isSkip = userTextClean.includes('skip') ||
                     userTextClean.includes('bỏ qua') ||
                     userTextClean.includes('bỏ qua phần giới thiệu') ||
                     userTextClean.includes('đi tiếp') ||
                     userTextClean.includes('vào câu hỏi chính');

      if (isSkip) {
        // Move to first question
        await this.prisma.interviewSession.update({
          where: { sessionId },
          data: { currentQuestionIndex: 0 },
        });

        const nextContent = isEn
          ? `No problem, we will skip the introduction and go straight to the main questions.\n\n${firstQuestion.question}`
          : `Không vấn đề gì, mình sẽ bỏ qua phần giới thiệu và đi thẳng vào phần câu hỏi chính.\n\n${firstQuestion.question}`;
        
        // Save the transition message since the backend moves the index to 0,
        // and we want this transition message to be recorded.
        await this.prisma.message.create({
          data: {
            sessionId,
            questionId: firstQuestion.id,
            role: 'assistant',
            content: nextContent,
          },
        });

        return {
          action: 'move_next',
          evaluation: { technical_score: 0, communication_score: 0, confidence_score: 0 },
          analysis: { understanding_level: 'none', missing_areas: [], candidate_exhausted: true },
          message: null,
          status: 'ongoing',
          currentQuestionIndex: 0,
        };
      }

      // Count existing assistant intro messages to see how many followups we've had
      const introAssistantMessages = await this.prisma.message.findMany({
        where: { sessionId, questionId: 'intro', role: 'assistant' },
      });
      const assistantIntroCount = introAssistantMessages.length; 

      // Retrieve intro messages for AI evaluation context
      const recentMessages = await this.prisma.message.findMany({
        where: { sessionId, questionId: 'intro' },
        orderBy: { createdAt: 'asc' },
      });

      // Call AI to evaluate and decide next follow-up or transition
      const aiResponse = await this.aiService.evaluateAnswer(
        'Self-Introduction',
        'Please introduce yourself, your experience and career highlights.',
        recentMessages,
        null,
        userText,
      );

      // We ask followups. Let's decide if we want to transition to technical questions.
      const shouldTransition = assistantIntroCount >= 3 || aiResponse.decision.action === 'move_next';

      if (shouldTransition) {
        // Move to first question
        await this.prisma.interviewSession.update({
          where: { sessionId },
          data: { currentQuestionIndex: 0 },
        });

        const nextContent = isEn
          ? `Thank you. Those insights help me understand your experience better. Now, I will transition to the main questions of the interview.\n\n${firstQuestion.question}`
          : `Cảm ơn bạn. Những chia sẻ vừa rồi giúp mình hiểu rõ hơn về kinh nghiệm của bạn. Bây giờ mình sẽ chuyển sang phần câu hỏi chính của buổi phỏng vấn.\n\n${firstQuestion.question}`;
        
        await this.prisma.message.create({
          data: {
            sessionId,
            questionId: firstQuestion.id,
            role: 'assistant',
            content: nextContent,
          },
        });

        return {
          action: 'move_next',
          evaluation: aiResponse.evaluation,
          analysis: aiResponse.analysis,
          message: null,
          status: 'ongoing',
          currentQuestionIndex: 0,
        };
      }

      // Otherwise, save AI's evaluation
      await this.prisma.interviewEvaluation.create({
        data: {
          sessionId,
          questionId: 'intro',
          technicalScore: 0,
          communicationScore: aiResponse.evaluation.communication_score || 0,
          confidenceScore: aiResponse.evaluation.confidence_score || 0,
          feedback: JSON.stringify(aiResponse.analysis),
        },
      });

      return {
        action: 'followup',
        evaluation: aiResponse.evaluation,
        analysis: aiResponse.analysis,
        message: null,
        status: 'ongoing',
        currentQuestionIndex: -1,
      };
    }

    const currentQuestion = questions[session.currentQuestionIndex] || { id: 'unknown_question', topic: 'General', question: questionText };

    // Load recent messages for this question to context
    const recentMessages = await this.prisma.message.findMany({
      where: { sessionId, questionId: currentQuestion.id },
      orderBy: { createdAt: 'asc' },
    });

    const memory = await this.prisma.interviewMemory.findUnique({
      where: { sessionId },
    });

    // 2. Call AI to evaluate answer
    const aiResponse = await this.aiService.evaluateAnswer(
      currentQuestion.topic || 'General',
      questionText,
      recentMessages,
      memory,
      userText,
    );

    // 3. Save evaluation
    await this.prisma.interviewEvaluation.create({
      data: {
        sessionId,
        questionId: currentQuestion.id,
        technicalScore: aiResponse.evaluation.technical_score || 0,
        communicationScore: aiResponse.evaluation.communication_score || 0,
        confidenceScore: aiResponse.evaluation.confidence_score || 0,
        feedback: JSON.stringify(aiResponse.analysis),
      },
    });

    // Count how many assistant messages have been sent for this question
    const assistantMessagesCount = await this.prisma.message.count({
      where: { sessionId, questionId: currentQuestion.id, role: 'assistant' },
    });

    const isCurrentFailed = this.isFailedEvaluation({
      technicalScore: aiResponse.evaluation.technical_score,
      communicationScore: aiResponse.evaluation.communication_score,
      confidenceScore: aiResponse.evaluation.confidence_score,
      feedback: JSON.stringify(aiResponse.analysis),
    });

    // Check for 2 consecutive failures
    const recentEvaluations = await this.prisma.interviewEvaluation.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    let isConsecutiveFailures = false;
    if (recentEvaluations.length >= 2) {
      const currentEval = recentEvaluations[0];
      const prevEval = recentEvaluations[1];
      if (currentEval.questionId === prevEval.questionId) {
        const currentFailed = this.isFailedEvaluation(currentEval);
        const prevFailed = this.isFailedEvaluation(prevEval);
        if (currentFailed && prevFailed) {
          isConsecutiveFailures = true;
        }
      }
    }

    let newQuestionIndex = session.currentQuestionIndex;
    
    // Probing cap: transition to next question if:
    // 1. AI says move_next
    // 2. Candidate is exhausted
    // 3. 2 consecutive failures
    // 4. Probed deeper than 2 questions (root + 2 followups => count >= 3)
    // 5. Candidate failed to answer the current question/followup (isCurrentFailed)
    const shouldMoveNext = 
      aiResponse.decision.action === 'move_next' || 
      aiResponse.analysis.candidate_exhausted || 
      isConsecutiveFailures ||
      assistantMessagesCount >= 3 ||
      isCurrentFailed;

    if (shouldMoveNext) {
      newQuestionIndex += 1;
      
      // Update session with new question index
      await this.prisma.interviewSession.update({
        where: { sessionId },
        data: { currentQuestionIndex: newQuestionIndex },
      });

      // After a topic finishes, update memory summary in background
      this.updateMemory(sessionId).catch(err => console.error('Failed to update memory:', err));
    }

    // Check if session has ended (completed all questions)
    const isCompleted = newQuestionIndex >= questions.length;
    if (isCompleted) {
      await this.prisma.interviewSession.update({
        where: { sessionId },
        data: { status: 'completed' }
      });
    }

    return {
      action: shouldMoveNext ? 'move_next' : aiResponse.decision.action,
      evaluation: aiResponse.evaluation,
      analysis: aiResponse.analysis,
      message: null,
      status: isCompleted ? 'completed' : 'ongoing',
      currentQuestionIndex: newQuestionIndex,
    };
  }

  async skipIntro(sessionId: string, language?: string) {
    const session = await this.prisma.interviewSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.currentQuestionIndex !== -1) {
      return { status: 'error', message: 'Introduction already completed or skipped.' };
    }

    const isEn = language === 'en-US';

    // Load session questions
    const sessionQuestionIds = session.questionIds || [];
    let questions: any[] = [];
    if (sessionQuestionIds.length > 0) {
      questions = await this.prisma.interviewQuestion.findMany({
        where: { id: { in: sessionQuestionIds } },
      });
      questions.sort((a, b) => sessionQuestionIds.indexOf(a.id) - sessionQuestionIds.indexOf(b.id));
    }

    const firstQuestion = questions[0];

    // Save user's skip message
    await this.prisma.message.create({
      data: {
        sessionId,
        questionId: 'intro',
        role: 'user',
        content: isEn ? '[Skipped self-introduction]' : '[Bỏ qua phần giới thiệu bản thân]',
      },
    });

    // Move to first question
    await this.prisma.interviewSession.update({
      where: { sessionId },
      data: { currentQuestionIndex: 0 },
    });

    const nextContent = isEn
      ? `No problem, we will skip the introduction and go straight to the main questions.\n\n${firstQuestion.question}`
      : `Không vấn đề gì, mình sẽ bỏ qua phần giới thiệu và đi thẳng vào phần câu hỏi chính.\n\n${firstQuestion.question}`;
    
    // Save assistant response message
    const assistantMessage = await this.prisma.message.create({
      data: {
        sessionId,
        questionId: firstQuestion.id,
        role: 'assistant',
        content: nextContent,
      },
    });

    return {
      action: 'move_next',
      evaluation: { technical_score: 0, communication_score: 0, confidence_score: 0 },
      analysis: { understanding_level: 'none', missing_areas: [], candidate_exhausted: true },
      message: assistantMessage,
      status: 'ongoing',
      currentQuestionIndex: 0,
    };
  }
}
