# Sitnovate26 — Intelligent IVR + WhatsApp Business Platform

> **A 24/7, multilingual, emotionally intelligent Interactive Voice Response (IVR) system fully integrated with WhatsApp Business, CRM, ERP, and web platforms — with built-in urgency detection, sentiment analysis, and fraud pattern recognition.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Software Development Life Cycle (SDLC)](#software-development-life-cycle-sdlc)
   - [Phase 1 — Planning](#phase-1--planning)
   - [Phase 2 — Requirements Analysis](#phase-2--requirements-analysis)
   - [Phase 3 — System Design](#phase-3--system-design)
   - [Phase 4 — Development](#phase-4--development)
   - [Phase 5 — Testing & QA](#phase-5--testing--qa)
   - [Phase 6 — Deployment](#phase-6--deployment)
   - [Phase 7 — Maintenance & Iteration](#phase-7--maintenance--iteration)
5. [Technology Stack](#technology-stack)
6. [Integrations](#integrations)
7. [Security & Compliance](#security--compliance)
8. [Getting Started](#getting-started)
9. [Contributing](#contributing)
10. [License](#license)

---

## Project Overview

**Sitnovate26** is an enterprise-grade communication platform that bridges traditional telephony with modern messaging through a single, unified AI layer. The system provides customers with a seamless experience whether they reach out via a phone call (IVR) or WhatsApp Business chat — and responds in their preferred language, at any hour of the day.

Unlike conventional IVR systems that follow rigid decision trees, Sitnovate26 leverages large language models (LLMs) and real-time NLP pipelines to understand context, detect emotional states, flag suspicious interactions, and autonomously execute actions inside connected CRM, ERP, and web systems — all without requiring human intervention for routine tasks.

---

## Key Features

| Feature | Description |
|---|---|
| 📞 **IVR + WhatsApp Integration** | Unified conversation engine handles both voice (IVR via SIP/PSTN) and text (WhatsApp Business API) through a single NLP pipeline. |
| 🌍 **Multilingual Support** | Automatic language detection and response generation in 20+ languages, with dialect-aware TTS for voice calls. |
| 🧠 **Emotional & Contextual Intelligence** | Sentiment analysis classifies caller/chatter mood (frustrated, confused, satisfied) and adapts tone, vocabulary, and escalation paths accordingly. |
| ⚡ **Urgency Detection** | Real-time keyword, tone, and pattern analysis escalates critical issues (medical emergencies, service outages, payment failures) to live agents instantly. |
| 🔍 **Fraud Pattern Recognition** | Anomaly detection flags social-engineering attempts, account takeover patterns, repeated failed authentication, and abnormal transaction requests. |
| 🔗 **CRM / ERP Integration** | Reads and writes customer records, tickets, orders, and invoices in real time via REST/GraphQL APIs to platforms such as Salesforce, HubSpot, SAP, and Odoo. |
| 🌐 **Website Actions** | Executes web-based workflows (form submissions, appointment bookings, status lookups) on behalf of customers directly from within a conversation. |
| 🕐 **24 / 7 Availability** | Cloud-native, auto-scaling deployment ensures zero downtime and consistent SLA across time zones. |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Inbound Channels                          │
│         Phone (PSTN/SIP)              WhatsApp Business API      │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
                ▼                             ▼
┌──────────────────────────────────────────────────────────────────┐
│               Unified Conversation Gateway                        │
│  • Speech-to-Text (STT) / Text normalization                     │
│  • Language Detection & Translation Layer                        │
│  • Session & Context Management                                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     AI Intelligence Core                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Intent NLU  │  │  Sentiment & │  │  Fraud & Anomaly       │ │
│  │  & Dialogue  │  │  Urgency     │  │  Detection Engine      │ │
│  │  Manager     │  │  Classifier  │  │                        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
       ┌─────────────┐  ┌─────────────┐   ┌──────────────┐
       │  CRM / ERP  │  │   Website   │   │  Live Agent  │
       │  Connector  │  │  Automation │   │  Escalation  │
       │ (Salesforce,│  │ (Booking,   │   │  (Dashboard) │
       │ SAP, Odoo…) │  │  Forms…)    │   │              │
       └─────────────┘  └─────────────┘   └──────────────┘
```

---

## Software Development Life Cycle (SDLC)

This project follows an **Agile-iterative SDLC model** with two-week sprints, continuous integration, and continuous delivery (CI/CD). The model incorporates DevSecOps principles to address security at every phase.

---

### Phase 1 — Planning

**Objective:** Define scope, stakeholders, resource requirements, and success criteria.

| Activity | Owner | Deliverable |
|---|---|---|
| Stakeholder interviews | Product Manager | Business Requirements Document (BRD) |
| Feasibility study (technical & financial) | Tech Lead | Feasibility Report |
| Define KPIs (CSAT, AHT, escalation rate) | Product Manager | KPI Framework |
| Risk assessment (data privacy, uptime SLA) | Security Lead | Risk Register |
| Sprint roadmap and backlog creation | Scrum Master | Product Backlog |

**Entry Criteria:** Approved project charter.  
**Exit Criteria:** Approved BRD and initial sprint plan.

---

### Phase 2 — Requirements Analysis

**Objective:** Translate business needs into functional and non-functional requirements.

**Functional Requirements (examples):**
- The system SHALL greet callers in their detected language within 2 seconds.
- The system SHALL escalate to a live agent when urgency score ≥ 0.8.
- The system SHALL update CRM records within 5 seconds of conversation end.
- The system SHALL flag interactions with fraud score ≥ 0.7 for supervisor review.
- The system SHALL handle ≥ 1,000 concurrent sessions without performance degradation.

**Non-Functional Requirements:**
- **Availability:** 99.9% uptime (≤ 8.7 hours downtime/year).
- **Latency:** < 500 ms end-to-end AI response time for text; < 1 s for voice.
- **Security:** SOC 2 Type II, GDPR, and DPDP Act compliance.
- **Scalability:** Horizontal auto-scaling to 10× baseline load within 3 minutes.
- **Accessibility:** WCAG 2.1 AA for web-based agent dashboard.

**Tools:** JIRA, Confluence, draw.io.

---

### Phase 3 — System Design

**Objective:** Create detailed technical blueprints for all system components.

#### 3.1 High-Level Design (HLD)
- Microservices architecture with independent deployable units per domain (IVR Engine, WhatsApp Gateway, NLP Core, Integration Bus, Admin Dashboard).
- Event-driven communication via Apache Kafka between services.
- Multi-region active-passive deployment with automated failover.

#### 3.2 Low-Level Design (LLD)
- Database schema for conversation sessions, customer profiles, audit logs.
- API contract definitions (OpenAPI 3.0 specs) for all internal and external endpoints.
- ML model architecture: intent classification (fine-tuned transformer), sentiment regression, fraud anomaly detection (Isolation Forest + LSTM).
- TTS voice persona design per language locale.

#### 3.3 Security Design
- End-to-end encryption (TLS 1.3) for all communication channels.
- OAuth 2.0 + PKCE for CRM/ERP API authentication.
- PII masking in logs; data residency controls per jurisdiction.
- Rate limiting and CAPTCHA challenge for suspicious sessions.

**Deliverables:** HLD document, LLD document, API specs, Data Flow Diagrams (DFD), ER diagrams, security threat model (STRIDE).

---

### Phase 4 — Development

**Objective:** Build and unit-test all components following coding standards.

#### Development Guidelines
- **Branching strategy:** Gitflow (`main` → `develop` → `feature/*`, `bugfix/*`, `hotfix/*`).
- **Code reviews:** Minimum 2 approvals required before merge to `develop`.
- **Coding standards:** PEP 8 (Python services), ESLint/Prettier (Node.js services), Google Java Style Guide (Java services).
- **Documentation:** All public APIs documented inline (docstrings / JSDoc); auto-generated via Swagger UI.

#### Sprint Breakdown (example)

| Sprint | Focus Area |
|---|---|
| 1 | Core IVR telephony engine (SIP stack, DTMF handling) |
| 2 | WhatsApp Business API gateway & webhook handler |
| 3 | Language detection & multilingual NLU pipeline |
| 4 | Sentiment analysis & urgency scoring service |
| 5 | Fraud & anomaly detection engine |
| 6 | CRM connector (Salesforce / HubSpot) |
| 7 | ERP connector (SAP / Odoo) |
| 8 | Website automation module |
| 9 | Live agent escalation dashboard |
| 10 | End-to-end integration, performance tuning, security hardening |

---

### Phase 5 — Testing & QA

**Objective:** Validate correctness, performance, security, and user experience.

#### Test Types

| Test Type | Tool | Coverage Target |
|---|---|---|
| Unit Tests | pytest, Jest | ≥ 80% code coverage |
| Integration Tests | Postman, pytest | All API endpoints |
| Dialogue / Conversation Tests | Custom IVR test harness | All call flows |
| Performance / Load Tests | k6, Locust | 1,000 concurrent sessions |
| Security / Penetration Tests | OWASP ZAP, Burp Suite | OWASP Top 10 |
| Multilingual Accuracy Tests | Custom NLU eval suite | ≥ 95% intent accuracy per language |
| Sentiment & Urgency Tests | Labeled dataset evaluation | ≥ 90% F1-score |
| Fraud Detection Tests | Synthetic fraud dataset | ≥ 85% precision, ≥ 80% recall |
| UAT | Real stakeholders | Sign-off checklist |

#### Definition of Done
- All test cases pass.
- No critical or high-severity open bugs.
- Performance benchmarks met.
- Security scan shows no critical findings.
- Product Owner sign-off on UAT.

---

### Phase 6 — Deployment

**Objective:** Release to production safely with zero or minimal downtime.

#### Deployment Strategy
- **Blue-Green Deployment** for zero-downtime releases of stateless services.
- **Canary Releases** for AI model updates (5% → 25% → 100% traffic rollout with automated rollback if error rate > 1%).
- **Infrastructure as Code (IaC):** Terraform for cloud infrastructure; Helm charts for Kubernetes workloads.
- **CI/CD Pipeline:** GitHub Actions → Docker build → Container Registry → Kubernetes (EKS / GKE).

#### Runbook Checklist (Pre-Production)
- [ ] All integration tests pass in staging environment.
- [ ] Database migrations verified and rolled back successfully in dry-run.
- [ ] Secrets rotated and stored in Vault / AWS Secrets Manager.
- [ ] Monitoring dashboards and alerts configured (Grafana, PagerDuty).
- [ ] Rollback plan documented and tested.
- [ ] Stakeholder communication sent.

---

### Phase 7 — Maintenance & Iteration

**Objective:** Continuously monitor, improve, and evolve the system post-launch.

#### Ongoing Activities
- **Monitoring:** Real-time dashboards tracking call completion rate, escalation rate, sentiment trends, fraud alerts, API latency, and error rates.
- **Model Retraining:** Monthly review of intent, sentiment, and fraud models using production data; retraining triggered when accuracy degrades > 3%.
- **Bug Triage:** SLA-based resolution — Critical (4 h), High (24 h), Medium (1 week), Low (next sprint).
- **Dependency Updates:** Automated Dependabot PRs reviewed weekly; security patches applied within 48 hours.
- **Feedback Loop:** Post-interaction CSAT surveys feed back into training data and dialogue design improvements.
- **Feature Roadmap:** Quarterly OKR review to prioritize new languages, integrations, and AI capability upgrades.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **IVR / Telephony** | Asterisk / FreeSWITCH, Twilio Voice, SIP.js |
| **WhatsApp** | WhatsApp Business API (Cloud API), 360dialog |
| **NLP / AI** | Python, Hugging Face Transformers, LangChain, OpenAI GPT-4o |
| **Speech** | Google STT / Deepgram (ASR), Google TTS / ElevenLabs (TTS) |
| **Fraud Detection** | scikit-learn, TensorFlow, Isolation Forest, LSTM |
| **Backend Services** | Python (FastAPI), Node.js (Express) |
| **Message Broker** | Apache Kafka |
| **Databases** | PostgreSQL (transactional), Redis (session/cache), Elasticsearch (logs) |
| **CRM / ERP** | Salesforce API, HubSpot API, SAP BTP, Odoo XML-RPC |
| **Infrastructure** | AWS / GCP, Kubernetes (EKS/GKE), Terraform, Helm |
| **CI/CD** | GitHub Actions, Docker, Amazon ECR / GCR |
| **Monitoring** | Prometheus, Grafana, Datadog, PagerDuty |
| **Security** | HashiCorp Vault, AWS WAF, OWASP ZAP |

---

## Integrations

### WhatsApp Business
- Receive inbound messages, send rich media replies (buttons, lists, templates).
- Webhook-based real-time message delivery with delivery receipts.
- Session management with 24-hour messaging window compliance.

### CRM Systems
- **Read:** Fetch customer profile, interaction history, open tickets.
- **Write:** Create/update leads, cases, contacts; log call/chat transcripts.
- **Trigger:** Initiate workflows (e.g., send follow-up email, assign agent).

### ERP Systems
- **Read:** Check order status, invoice details, inventory levels.
- **Write:** Create purchase requests, update delivery status.

### Websites
- Automated form submissions (appointment booking, support ticket creation).
- Status lookups (order tracking, account balance).
- Triggered via headless browser automation or direct API calls.

---

## Security & Compliance

- **Data Encryption:** All data at rest (AES-256) and in transit (TLS 1.3).
- **Authentication:** Multi-factor authentication for the admin dashboard; OAuth 2.0 for all API integrations.
- **PII Protection:** Automatic detection and masking of PII (names, phone numbers, account numbers) in logs and transcripts.
- **Compliance Frameworks:** GDPR (EU), DPDP Act (India), TCPA (US), PCI-DSS (payment data), SOC 2 Type II.
- **Audit Logging:** Immutable, tamper-evident audit trail for all system actions and data access events.
- **Fraud Controls:** Behavioral biometrics on voice channel; velocity checks; blacklist/watchlist screening.

---

## Getting Started

### Prerequisites
- Docker ≥ 24.x and Docker Compose ≥ 2.x
- Python ≥ 3.11
- Node.js ≥ 20.x
- A WhatsApp Business API account (Meta / 360dialog)
- CRM/ERP API credentials (as applicable)

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/sharvayuzade/Sitnovate26.git
cd Sitnovate26

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# 3. Start all services with Docker Compose
docker compose up --build

# 4. Access the admin dashboard
open http://localhost:3000
```

### Environment Variables

| Variable | Description |
|---|---|
| `WHATSAPP_TOKEN` | WhatsApp Business API access token |
| `WHATSAPP_PHONE_ID` | WhatsApp Business phone number ID |
| `OPENAI_API_KEY` | OpenAI API key for LLM inference |
| `CRM_API_URL` | Base URL for CRM REST API |
| `CRM_API_KEY` | CRM authentication key |
| `ERP_API_URL` | Base URL for ERP REST API |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `KAFKA_BROKERS` | Kafka broker addresses |

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository and create a feature branch: `git checkout -b feature/your-feature-name`
2. Follow the coding standards outlined in `CONTRIBUTING.md` (coming soon).
3. Write or update tests for your changes.
4. Ensure all tests pass and linting is clean.
5. Submit a Pull Request with a clear description of the change and its motivation.

For bug reports and feature requests, please open a GitHub Issue using the appropriate template.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the Sitnovate team**

*Empowering businesses with intelligent, empathetic, and always-on customer communication.*

</div>
