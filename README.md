# 🌸 CycleCare – Menstrual & Reproductive Health Platform

An intelligent, full-stack menstrual and reproductive health platform powered by **Next.js 16**, **Express.js**, **Prisma ORM**, **Sentence Transformers (NLP)**, and a **Health Knowledge Graph (Neo4j)**.

---

## 🌟 Key Features

### 1. 🧠 Semantic Symptom Understanding (NLP & Embeddings)
- **Natural Language Parsing**: Allows users to enter symptoms in everyday speech (e.g. *"My stomach hurts during periods"*, *"feeling heavy fatigue and nausea"*).
- **Sentence Transformers Matching**: Employs `all-MiniLM-L6-v2` dense vector representations and cosine similarity to map vernacular descriptions to clinically normalized symptom nodes (e.g., *Menstrual Cramps / Dysmenorrhea* with 95%+ confidence).
- **1-Click Logging**: Directly log matched symptoms and estimated severities to your user profile.

### 2. 🕸️ Health Knowledge Graph (Neo4j & Resilient Graph Engine)
- **Entities & Nodes**:
  - `(:Symptom)` (Cramps, Bloating, Fatigue, Headache, Acne, Backache, Mood Swings, Nausea, Mastalgia, Insomnia, Heavy Flow)
  - `(:MenstrualPhase)` (Menstrual, Follicular, Ovulatory, Luteal)
  - `(:HealthCondition)` (Primary Dysmenorrhea, Endometriosis, PMS, PMDD, Iron Deficiency Anemia, PCOS)
  - `(:Nutrition)` (Magnesium, Omega-3s, Ginger, Iron & Vitamin C, Potassium Hydration, Vitamin B6, Chamomile)
  - `(:EducationalResource)` (Clinical guides, phase-syncing nutrition, restorative yoga)
- **Relationships**:
  - `(:Symptom)-[:ASSOCIATED_WITH]->(:MenstrualPhase)`
  - `(:Symptom)-[:INDICATES_RISK_OF]->(:HealthCondition)`
  - `(:Nutrition)-[:ALLEVIATES]->(:Symptom)`
  - `(:EducationalResource)-[:COVERS_SYMPTOM]->(:Symptom)`
  - `(:EducationalResource)-[:RELEVANT_TO_PHASE]->(:MenstrualPhase)`
- **Dual-Mode Connectivity**: Connects to active Neo4j instances via Bolt protocol (`bolt://localhost:7687`), and seamlessly falls back to a built-in in-memory knowledge graph ontology if Neo4j is offline or in development.

### 3. 🔍 Semantic Health Search
- Meaning-based search engine comparing user queries (e.g. *"what to eat when bleeding heavily?"*, *"yoga for period cramps"*) against embedded knowledge base resources.
- Returns relevance match scores and direct links to medically reviewed resources.

### 4. 💡 Context-Aware Recommendations & AI Health Assistant
- Combines the user's current cycle phase (calculated from cycle start date & history in PostgreSQL), user-reported symptoms, and Knowledge Graph traversal.
- Offers tailored nutrition suggestions with biological mechanisms, wellness actions, and educational guides.
- **Strict Clinical Disclaimer**: Emphasizes that information is for general wellness only, never replacing professional medical evaluation.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│             Next.js 16 React Frontend                  │
│   • AI Health Assistant (/assistant)                   │
│   • Semantic Knowledge Search (/dashboard)             │
│   • Natural Language Symptom Interpreter (/symptoms)  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (Port 3000 -> 5000)
┌───────────────────────────▼────────────────────────────┐
│             Express.js API Gateway (Port 5000)         │
│   • Auth, Cycles, Symptoms, Dashboard, Notifications   │
│   • NEW: /api/ai/symptom-analysis                      │
│   • NEW: /api/ai/semantic-search                       │
│   • NEW: /api/ai/recommendations                       │
│   • NEW: /api/ai/graph/explore                         │
└──────────────┬──────────────────────────┬──────────────┘
               │ PostgreSQL (Neon)        │ HTTP
               ▼                          ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│     Prisma ORM DB         │  │ Python AI Microservice  │
│  • User, Cycle            │  │ (Port 8000)             │
│  • SymptomLog, MoodLog    │  │ • Sentence Transformers │
│  • Notification           │  │ • Neo4j / In-Memory KG  │
└───────────────────────────┘  └─────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Start the Python AI Microservice
```bash
cd ai-service
python main.py
```
*Runs at `http://localhost:8000`. By default, uses the built-in resilient graph engine. To connect to a live Neo4j database, configure `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` in `ai-service/.env`.*

### 2. Start the Express Backend
```bash
cd backend
npm install
npm run dev
```
*Runs at `http://localhost:5000`.*

To run the automated Express-to-AI integration test:
```bash
npm run test:ai
```

### 3. Start the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
*Visit `http://localhost:3000` in your browser.*
