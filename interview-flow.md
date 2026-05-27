# AI Interview Backend Architecture Guide

# Overview

Build an AI-powered mock interview backend system.

The system should:

* use predefined root interview questions
* allow AI to dynamically evaluate answers
* allow AI to decide whether deeper follow-up is needed
* allow AI to determine when candidate understanding is sufficient
* allow AI to move naturally to the next question
* preserve interview context and memory
* create a human-like interview experience

The backend should remain simple and controllable.

---

# Core Philosophy

The interview flow should be:

```text
Backend controls:
- question order
- interview topics
- session persistence
- interview state

AI controls:
- answer evaluation
- probing depth
- follow-up generation
- confidence detection
- exhaustion detection
- move-next recommendation
```

---

# Important Design Decision

DO NOT hardcode expected signals.

The AI should dynamically infer:

* missing understanding
* weak areas
* confidence level
* depth of understanding
* whether candidate knowledge is exhausted

The backend should only define:

* topic
* root question
* difficulty
* level

---

# Example Question Structure

```json
{
  "id": "react_render_01",
  "role": "frontend",
  "level": "junior",
  "topic": "react",
  "difficulty": 2,
  "question": "What is React re-render?"
}
```

---

# System Architecture

```text
Frontend
  ↓
NestJS Backend
  ↓
Interview Engine
  ↓
Context Builder
  ↓
OpenAI Service
  ↓
OpenAI API
```

---

# Interview Flow

## Step 1 — Start Interview

Frontend:

```http
POST /interviews/start
```

Request:

```json
{
  "role": "frontend",
  "level": "junior"
}
```

Backend:

1. create session
2. load predefined questions
3. select first question
4. initialize interview state
5. return first question

---

# Step 2 — Candidate Answers

Frontend:

```http
POST /interviews/:sessionId/answer
```

Request:

```json
{
  "answer": "When state or props change"
}
```

---

# Backend Processing Pipeline

When answer is received:

1. save candidate answer
2. load current question
3. load recent conversation messages
4. load interview memory summary
5. build AI context
6. call OpenAI API
7. parse AI response
8. save evaluation
9. decide:

   * continue follow-up
   * move next question
10. return next message

---

# AI Responsibilities

The AI should:

* evaluate answer quality
* infer missing understanding
* detect confidence
* detect uncertainty
* ask deeper follow-up questions
* simplify questions if candidate struggles
* detect when candidate knowledge is exhausted
* politely move to next topic if needed

The AI should behave like a real interviewer.

---

# Important Interview Rules

## Rule 1

Ask only ONE question at a time.

---

## Rule 2

Stay within the current topic.

Do not randomly change topic.

---

## Rule 3

If candidate shows partial understanding:

* ask deeper follow-up questions
* identify missing concepts naturally

---

## Rule 4

If candidate says:

```text
- I don't know
- I'm not sure
- That's all I know
```

Then:

* stop excessive probing
* acknowledge politely
* move to next question naturally

---

## Rule 5

Avoid repetitive questioning.

If enough understanding is collected:

* move next

---

# AI System Prompt

```text
You are an experienced frontend interviewer.

Your responsibilities:
- evaluate candidate understanding
- ask natural follow-up questions
- identify missing concepts dynamically
- determine whether candidate understanding is sufficient
- detect confidence and uncertainty
- avoid repetitive probing

Rules:
- Ask ONE question at a time
- Stay within the current topic
- Ask deeper follow-up questions if understanding is partial
- If candidate clearly does not know:
  politely acknowledge and move to another question
- If candidate says:
  "I don't know"
  "That's all I know"
  "I'm not sure"
  avoid excessive probing

Your interview style should feel:
- natural
- supportive
- realistic
- conversational

Return JSON only.
```

---

# AI User Prompt Structure

```text
Current topic:
React rendering

Main question:
"What is React re-render?"

Recent conversation:
AI: What is React re-render?
User: When state changes

Candidate latest answer:
"Child component also re-renders"

Evaluate:
- answer quality
- understanding depth
- missing concepts
- whether follow-up is needed
- whether candidate exhausted their knowledge

Return structured JSON.
```

---

# AI Response Schema

```json
{
  "evaluation": {
    "technical_score": 7,
    "communication_score": 6,
    "confidence_score": 6
  },
  "analysis": {
    "understanding_level": "partial",
    "missing_areas": [
      "render optimization",
      "React.memo"
    ],
    "candidate_exhausted": false
  },
  "decision": {
    "action": "followup"
  },
  "next_message": "When does React.memo help avoid unnecessary re-renders?"
}
```

---

# Candidate Exhausted Example

Candidate:

```text
I don't know.
```

AI response:

```json
{
  "decision": {
    "action": "move_next"
  },
  "analysis": {
    "candidate_exhausted": true
  },
  "next_message": "That's okay. Let's move on to hooks. Can you explain what useEffect is used for?"
}
```

---

# Context Strategy

DO NOT send the full transcript every request.

Instead send:

```text
- current topic
- current root question
- recent messages
- memory summary
- latest answer
```

---

# Recent Messages Example

```text
AI: What is React re-render?
User: When state changes
AI: If the parent component renders, does the child component render?
User: Yes
```

---

# Interview Memory Summary

The backend should periodically generate summaries.

Example:

```json
{
  "strengths": [
    "React basics",
    "state management"
  ],
  "weaknesses": [
    "optimization",
    "memoization"
  ]
}
```

Update memory:

* every 3-5 messages
* or after each topic

---

# Move Next Logic

The AI should recommend:

```json
{
  "action": "move_next"
}
```

The backend should still apply simple safety rules.

Example:

```ts
if (followupCount >= 3) {
  moveNext();
}
```

---

# Backend Responsibilities

The backend should:

* manage interview sessions
* load predefined questions
* track current question index
* store conversation history
* store interview memory
* build prompts
* call OpenAI API
* validate AI responses
* save evaluations
* move to next question
* generate final report

---

# Backend Should NOT

The backend should NOT:

* hardcode expected signals
* hardcode follow-up trees
* manually control probing depth
* manually detect understanding gaps

Those responsibilities belong to AI.

---

# Database Design

## interview_sessions

```sql
id
user_id
role
level
current_question_index
status
created_at
```

---

## interview_questions

```sql
id
role
level
topic
question
difficulty
order_index
```

---

## interview_messages

```sql
id
session_id
question_id
role
content
created_at
```

---

## interview_evaluations

```sql
id
session_id
question_id
technical_score
communication_score
confidence_score
feedback
created_at
```

---

## interview_memory

```sql
session_id
summary
strengths
weaknesses
updated_at
```

---

# Recommended Backend Modules

```text
src/
 ├── interview/
 ├── ai/
 ├── prompt/
 ├── context/
 ├── database/
 └── common/
```

---

# OpenAI Service Responsibilities

The OpenAI service should:

* build prompts
* call OpenAI API
* validate JSON responses
* retry malformed outputs
* parse structured evaluation data

---

# Example Full Flow

## Root Question

```text
What is React re-render?
```

Candidate:

```text
When state changes.
```

AI detects:

```text
Partial understanding.
```

AI follow-up:

```text
If the parent component renders, does the child component re-render?
```

Candidate:

```text
I'm not sure.
```

AI detects:

```text
Knowledge exhausted.
```

AI response:

```text
That's okay. Let's move on to hooks.

Can you explain what useEffect is used for?
```

Backend:

```text
move to next predefined root question
```

---

# Final Goal

Build an interview system where:

* root interview structure is predefined
* AI dynamically adapts follow-up depth
* AI naturally evaluates understanding
* AI detects when candidate knowledge is exhausted
* AI moves topics naturally
* interview feels realistic and conversational
* backend remains simple and maintainable
