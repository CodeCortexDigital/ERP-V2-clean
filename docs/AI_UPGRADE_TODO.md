# AI Integration Upgrade — Master TODO

> Progress (2026-09-24): Phases 0–2 done except items marked `[~]`/`[ ]`. Branch `feat/ai-upgrade`.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · 🔴 security · 🟠 broken in prod · 🟢 new capability

Each task has an ID (e.g. `P0.3`) so commits/PRs can reference it. Every phase ends with a **Definition of Done** gate — don't start the next phase until the gate passes.

---

## Decisions needed before we start

- [ ] **D1. Default LLM provider** — Claude / OpenAI / Gemini. Interim: `AI_PROVIDER` unset → OpenAI if `OPENAI_API_KEY` is set, else Anthropic. Claude defaults to `claude-opus-5`.
- [ ] **D2. Model tiers** — one "fast/cheap" model (chat, classification, drafting) and one "smart" model (grading, lesson plans, report remarks).
- [ ] **D3. Budget** — monthly AI spend cap overall and per tenant.
- [ ] **D4. ML hosting** — (a) separate Render worker service, (b) scheduled GitHub Action writing scores to DB, or (c) drop heavy ML (face recognition) for now.
- [ ] **D5. Languages** — English + Urdu (and Roman Urdu?) for parent-facing output.
- [ ] **D6. Data policy** — which fields may be sent to an external LLM. Interim default: phone/email/CNIC/address masked (`AI_SHARE_CONTACT_INFO=false`).

---

## Phase 0 — Security & correctness fixes (blockers)

These ship first, independently, as small PRs.

### P0.1 🔴 Authenticate the chat endpoint
- [x] Convert `ai_chat` in [backend/services/ai/views.py](../backend/services/ai/views.py) to a DRF `@api_view(["POST"])` with `@permission_classes([IsAuthenticated])` so JWT auth applies (it's currently a plain Django view → `request.user` is always anonymous for the SPA).
- [x] Remove `@csrf_exempt`.
- [x] **Never** read `role` from the request body — derive it only from `get_user_role(request.user)`.
- [x] Remove `body.role` from `sendAiMessage` in [frontend/src/services/ai.service.ts](../frontend/src/services/ai.service.ts).
- **Accept:** anonymous POST → 401; student JWT cannot trigger admin tools even when sending `role: "admin"`.

### P0.2 🔴 Role-gate the offline fallback
- [x] `_offline_tool_answer` currently runs admin branches (finance, defaulters, payroll, strength) for any caller. Gate every admin branch on `role in ("admin", "accountant")` (and teacher where appropriate).
- **Accept:** a student asking "finance summary" gets a polite refusal.

### P0.3 🔴 Tenant-scope every AI tool
- [x] `Student` uses `SoftDeleteModel`, not `TenantScopedModel`, so it is **not** auto-scoped. Audit every model used in [backend/services/ai/tools.py](../backend/services/ai/tools.py) (Student, Invoice, FeeStructure, AttendanceRecord, Exam, Homework, ClassSubject, TimetableEntry, BehaviourRating, Observation, Certificate, Notification, Teacher, Payslip).
- [x] Pass `tenant` into every tool and filter explicitly (`.filter(tenant=tenant)`), or route through the helpers in `services/core/tenants/scoping.py`.
- **Accept:** test with two tenants proves tool output never crosses tenants.

### P0.4 🔴 Scope teacher tools
- [x] Teachers currently get all `ADMIN_TOOLS` unscoped (whole-school search incl. phone numbers). Restrict to their classes via `_get_teacher_class_ids`, or give teachers a separate scoped tool set.

### P0.5 🔴 Lock down AllowAny AI endpoints
In [backend/services/analytics/ai_views.py](../backend/services/analytics/ai_views.py):
- [x] `train_and_predict` → admin only (and later: async job, see P4.2).
- [x] `get_student_predictions` → authenticated + role-scoped.
- [x] `generate_timetable`, `generate_quiz` → teacher/admin.
- [x] `publish_quiz` → teacher/admin, and the teacher must own the class.

### P0.6 🟠 Fix the OpenAI tool-calling loop
- [x] `req.append(tc.message)` → append the assistant message (`msg`) **once**, before the tool results.
- [x] Fix call signature: `call_tool(fn_name, fn_args, user=user)` (currently `call_tool(fn_name, user, role, **fn_args)` → TypeError).
- [x] Admin role currently resolves to `None` → gets zero tools. Fix after P0.1.
- [x] Replace `except Exception: pass` with logging + Sentry capture; return `offline: true` with a reason.
- **Accept:** a live question that requires a tool returns an LLM answer, not the keyword fallback.

### P0.7 🔴 PII minimisation
- [x] Per D6, strip/mask sensitive fields (phone, guardian phone, CNIC, address) from tool results before they go to the LLM unless the question explicitly needs them and the role allows it.

### P0.8 🟠 Remove fake data shown as real
- [x] [AnalyticsPage.tsx](../frontend/src/pages/education/AnalyticsPage.tsx) hardcodes "AI At-Risk Students" and teacher performance. Replace with an empty state ("No risk assessment run yet") until P3.4 lands.
- [x] Remove the fake-success `generate_timetable` stub in `services/ai/views.py` (return 501 or wire to the real optimizer in P3.8).

### P0.9 Tests for Phase 0
- [x] `backend/tests/test_ai_security.py`: anonymous 401, role spoofing, cross-tenant isolation, student-cannot-see-finance, teacher scoping.

**✅ Phase 0 DoD:** all tests pass in CI; manual check on the deployed Render instance that `/api/v1/ai/chat/` rejects anonymous calls.

---

## Phase 1 — AI platform foundation

### P1.1 Provider-agnostic LLM client
- [x] New app `backend/services/ai/llm/`:
  - `base.py` — `LLMClient` interface: `respond`, `stream`, `structured`. `embed(texts)` comes with P3.1.
  - `anthropic_client.py`, `openai_client.py` adapters. Gemini adapter deferred until D1 picks it (can't be verified against a live API yet).
  - `llm/__init__.py:get_llm_client` — picks provider from `AI_PROVIDER` env; `AI_MODEL_FAST`, `AI_MODEL_SMART`.
- [x] Normalised tool-call format so tools are defined once.
- [~] Timeouts + SDK retries with backoff done; on provider failure the chat falls back to offline mode. Cross-provider failover not done (needs two keys).
- [x] Add SDKs to `backend/requirements.txt`; update `.env.example` and `render.yaml` env vars.

### P1.2 Tool registry rewrite
- [x] Replace hand-written `TOOL_SCHEMAS` + dispatch dict in `tools.py` with an `@ai_tool(description, roles, properties)` registry (explicit schemas rather than type-hint generation).
- [x] Registry enforces role + tenant + scope **centrally** (not inside each tool).
- [ ] Split tools into modules (`tools/students.py`, `finance.py`, …) — worth doing when Phase 3 adds tools.
- [x] Validate/clamp arguments (e.g. `limit ≤ 50`).

### P1.3 Agent loop
- [x] Multi-step tool loop (max N iterations, e.g. 6) — the model can call several tools, see results, call more.
- [x] Parallel tool calls supported.
- [x] Token budget per request; truncate large tool results.
- [x] Prompt caching for the system prompt + tool definitions.

### P1.4 Conversation persistence
- [x] Models: `AIConversation` (tenant, user, role, title, created_at) and `AIMessage` (conversation, role, content, tool_calls JSON, tokens_in/out, latency_ms, model).
- [x] Endpoints: list conversations, get conversation, delete, rename.
- [x] Server loads history by `conversation_id` — client no longer sends full history.

### P1.5 Streaming responses
- [x] SSE endpoint `POST /api/v1/ai/chat/stream/` (Daphne/ASGI already in place) or reuse Channels WebSocket.
- [x] Stream events: `token`, `tool_start` (e.g. "Checking attendance…"), `tool_end`, `done`, `error`.

### P1.6 Usage metering & limits
- [x] `AIUsage` model (tenant, user, feature, model, tokens, date). Cost estimate is computed in reports (P5.4), not stored.
- [x] Per-user rate limit (`AI_RATE_LIMIT`/`AI_RATE_WINDOW`, Django cache = Redis in prod) and per-school monthly token cap (`AI_TENANT_MONTHLY_TOKENS`, from `AIUsage`).
- [x] Feature flags via `services/core/features` (`quota.feature_enabled`: on unless a flag record says off). `ai_chat` wired; the others get wired as their features land.

### P1.7 Audit & observability
- [x] Log every tool call (user, tool, args, row count) through the existing `services/core/audit`.
- [ ] Sentry spans around LLM calls; Prometheus metrics: latency, tokens, errors, fallback rate. (Latency/tokens are stored per message in `AIMessage` meanwhile.)

### P1.8 Frontend chat upgrade
- [x] [AiAssistant.tsx](../frontend/src/components/AiAssistant.tsx): streaming rendering, markdown + tables, "thinking/using tool" chips, conversation sidebar/history, stop button, copy, 👍/👎 feedback (stored on `AIMessage`).
- [~] Markdown tables render in chat (`MarkdownText`). Charts not yet.
- [x] Keep voice input/output; add Urdu speech recognition option (D5).
- [x] Role is server-derived (`mode` prop now only picks UI copy/suggestions).

### P1.9 Retire the keyword fallback
- [~] Keyword fallback kept (moved to `services/ai/offline.py`): production has no AI key configured yet, so it is the only working chat there. Delete once a key is live and stable.
- [x] Remove `ai-ml/chatbot/agent.py` (Ollama) and the duplicate `/ai/chat/` in `analytics/ai_urls.py`.

**✅ Phase 1 DoD:** chat works end-to-end on Render with streaming, history, tools for all 4 roles, usage recorded, rate limits enforced, tests green.

---

## Phase 2 — Mount & modernise existing AI features

### P2.1 🟠 Mount analytics AI routes
- [x] `services/analytics/ai_urls.py` included from `services/ai/urls.py` (duplicate chat route removed).
- [x] Every frontend call resolves. ML endpoints answer 503 when ai-ml packages are missing (no more zero-score writes); removed the "Run Test Scan" button that faked face attendance.

### P2.2 Lesson plan generator → hosted LLM
- [x] `LLMClient.structured()` + strict JSON schema in `services/ai/generation.py` (objectives, materials, intro, timed activities, differentiation, assessment, homework).
- [ ] Ground in the school's curriculum (syllabus → topic → sub-topic) — page sends subject/class/topic only for now.
- [~] Plans are saved/edited through the existing `LessonPlan` form (AI only drafts fields). Versioning + PDF export not done.
- [x] [LessonPlannerPage.tsx](../frontend/src/pages/education/progress/LessonPlannerPage.tsx) shows server errors, fills objectives/differentiation.

### P2.3 Quiz generator → hosted LLM
- [x] Structured output: MCQ / true-false / short answer, difficulty, Bloom level, explanation, answer key.
- [ ] Ground on curriculum topics (and on uploaded material once P3.1 RAG exists).
- [x] Validation pass: each MCQ has 4 distinct options and the answer is one of them; invalid questions are dropped.
- [~] Quizzes are saved as drafts and publishing requires an explicit class (teachers: own classes only). No quiz UI exists yet — the review screen is still to build. The endpoint no longer uses `OFFLINE_QUIZ_CATALOG` (file kept for the legacy ML test).

### P2.4 Real risk data on the Analytics page
- [x] Serve `StudentRisk` / `AcademicPrediction` from DB via `get_student_predictions` (scoped by role/tenant).
- [x] Wire [AnalyticsPage.tsx](../frontend/src/pages/education/AnalyticsPage.tsx) to it (empty state when no scan has run).

**✅ Phase 2 DoD:** no AI feature in the UI returns 404, fake data, or template filler.

---

## Phase 3 — New AI capabilities

### P3.1 🟢 Knowledge base Q&A (RAG)
- [ ] Enable `pgvector` on Postgres; `KnowledgeDocument` + `KnowledgeChunk(embedding)` models, tenant-scoped.
- [ ] Admin upload: PDF/DOCX/TXT (policies, circulars, syllabus, handbook) → chunk → embed (background job).
- [ ] `search_knowledge_base` tool for the chat agent; answers cite source doc + page.
- [ ] Role visibility per document (staff-only vs public to parents).

### P3.2 🟢 AI report card remarks
- [ ] Inputs: marks trend, attendance %, behaviour ratings, teacher notes.
- [ ] Generate per-student remark per subject + overall; tone presets; English/Urdu.
- [ ] Bulk generate for a class → teacher review/edit grid → approve → saved into report card.
- [ ] Hook into existing report card PDF.

### P3.3 🟢 Parent communication drafting
- [ ] Draft messages for: fee reminder, absence alert, low performance, event notice, PTM invite.
- [ ] Personalised per student, bilingual (D5), respects SMS length limits.
- [ ] Send via existing SMS/WhatsApp broadcast; human approval required before send.

### P3.4 🟢 Explainable risk alerts
- [ ] Keep ML models for scores; LLM generates the "why" + recommended intervention into `StudentRisk.factors/recommendations` and the `Recommendation` model.
- [ ] Weekly digest to class teacher + admin (notification + optional email).

### P3.5 🟢 AI-assisted grading
- [ ] Teacher defines rubric per question; upload typed or photographed answers (vision model).
- [ ] Suggested marks + feedback per criterion; teacher confirms every mark (never auto-final).
- [ ] Store AI suggestion vs final mark for accuracy tracking.

### P3.6 🟢 Natural-language analytics
- [ ] "Compare fee collection by class this term vs last" → agent uses whitelisted aggregate tools (no raw SQL) → returns a table + chart spec rendered in chat.
- [ ] Add aggregate tools: fee collection by period/class, attendance trend, exam averages by subject/class, enrollment trend.

### P3.7 🟢 AI actions (write tools, confirmed)
- [ ] Propose-then-confirm pattern: agent prepares an action (send reminder to defaulters, create homework, schedule announcement), UI shows a confirmation card, only the confirm click executes.
- [ ] Every action audited.

### P3.8 🟢 Timetable optimizer
- [ ] Run [timetable_optimizer.py](../ai-ml/academics/timetable_optimizer.py) as a background job with real constraints (teacher availability, room, subject hours); LLM explains conflicts in plain language.

### P3.9 🟢 Student study helper (optional)
- [ ] Student-facing tutor limited to their syllabus topics; hints-not-answers mode during active homework/tests.

**✅ Phase 3 DoD:** each feature behind a feature flag, has tests, usage metered, and a teacher/admin-in-the-loop step where outputs affect students.

---

## Phase 4 — ML pipeline & infrastructure

### P4.1 ML packaging
- [ ] Decide per D4. Move `ai-ml/` models into an installable package or a separate service; stop `sys.path` hacking in `ai_views.py`.
- [ ] Pin `scikit-learn`/`xgboost` versions matching the committed `.pkl` files, or retrain.

### P4.2 Async jobs
- [ ] Training, batch risk scoring, embeddings, bulk remarks run as background jobs (Celery was removed from Render free plan → use a worker service, cron job, or DB-backed queue like `django-q2`/`procrastinate`).
- [ ] Job status endpoint + progress in UI.

### P4.3 Model quality
- [ ] Train on real tenant data (per-tenant or global with tenant features); hold-out evaluation; store metrics per model version.
- [ ] `MLModelVersion` table: version, trained_at, metrics, active flag.

### P4.4 Face recognition
- [ ] If kept (D4): separate service, consent capture for students/parents, embeddings encrypted at rest, deletion on request.

---

## Phase 5 — Quality, evaluation & governance

- [ ] **P5.1 Eval suite:** golden Q&A set per role (e.g. 50 questions) with expected tool calls; run in CI against a seeded DB; track pass rate across prompt/model changes.
- [ ] **P5.2 Red-team tests:** prompt injection via student names/notes, role escalation attempts, cross-tenant probes, requests for other students' data.
- [ ] **P5.3 Hallucination guard:** numbers in answers must come from tool results; system prompt + spot-check eval.
- [ ] **P5.4 Admin AI dashboard:** usage, cost per tenant, top questions, failure/fallback rate, 👎 feedback review.
- [ ] **P5.5 Docs:** update `docs/README.md`, `.env.example`, and an admin guide for AI settings.
- [ ] **P5.6 Privacy:** data-processing note for schools, per-tenant AI opt-out, retention policy for conversations.

---

## Suggested execution order

| Sprint | Tasks |
|---|---|
| 1 | P0.1 – P0.9 (security + correctness) |
| 2 | P1.1, P1.2, P1.3 (LLM client, tool registry, agent loop) |
| 3 | P1.4 – P1.9 (history, streaming, limits, frontend) |
| 4 | P2.1 – P2.4 (mount + modernise existing features) |
| 5 | P3.2, P3.3 (report remarks, parent messages — highest visible value) |
| 6 | P3.1, P3.6 (RAG, NL analytics) |
| 7 | P3.4, P3.5, P3.7 (risk explanations, grading, actions) |
| 8+ | Phase 4, P3.8, P3.9, Phase 5 continuous |
