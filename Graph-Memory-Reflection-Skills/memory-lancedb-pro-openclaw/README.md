# Graph Memory Mapping Skills

> **Graph-Enhanced Memory System** — Neo4j + Graph Memory hybrid retrieval for multi-agent collaboration

**Version**: 1.0.0  
**Branch**: `feat/graph-memory`  
**Status**: 🚧 In Development (Phase 1: Memory Graph Pro)

---

## 🎯 Overview

**Graph Memory Mapping** extends traditional vector-based memory with **knowledge graph capabilities**, enabling:

- **Multi-dimensional relationship mapping** — Connect memories via semantic, temporal, and causal relationships
- **Graph-based reasoning** — Discover hidden patterns through path traversal and graph inference
- **Hybrid retrieval** — Combine vector similarity + graph traversal for comprehensive results
- **Event-driven architecture** — React to memory changes in real-time

Built for **multi-agent collaboration** where agents share a unified graph memory layer.

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Layer                              │
│         (Feishu / WeChat / Email / Dashboard)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenClaw Gateway Layer                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Coordinator Agent (OpenClaw Native)                │   │
│  │  - Channel Management                                │   │
│  │  - Task Dispatch                                     │   │
│  │  - Health Monitoring                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ RPC / Event
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Hermes Agent Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Crawler  │ │ Parser   │ │ Analyzer │ │ Delivery │      │
│  │ Skill    │ │ Skill    │ │ Skill    │ │ Skill    │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       └────────────┴────────────┴────────────┘             │
│                         │                                   │
│                         ▼                                   │
│              ┌─────────────────────┐                       │
│              │   GraphClient SDK   │                       │
│              └─────────────────────┘                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Graph Memory Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Neo4j          │  │  Graph Memory        │                  │
│  │  (Knowledge    │  │  (Vector        │                  │
│  │   Graph)        │  │   Retrieval)    │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Graph-Centric** | All persistent state written to graph |
| **Hybrid Communication** | Real-time via RPC, state sync via graph |
| **Event-Driven** | Graph updates trigger events |
| **Modular** | Each Skill has single responsibility |
| **Extensible** | Add Skills without modifying core |

---

## 📋 Project Scope

### Component Breakdown

| Component | GitHub Repo | Form | Priority |
|-----------|-------------|------|----------|
| **Main Project** | `graph-multi-agent-system` | End-to-End Repo | P0 |
| **Memory Graph Pro** | `memory-graph-pro-skill` | OpenClaw Skill | P0 |
| **OpenClaw Coordinator** | `openclaw-coordinator-skill` | OpenClaw Skill | P0 |
| **Hermes Skills** | `hermes-graph-skills` | Hermes Skill Package | P1 |

### Development Phases

| Phase | Content | Duration | Output |
|-------|---------|----------|--------|
| **Phase 1** | Memory Graph Pro | 2-3 weeks | Skill installable |
| **Phase 2** | OpenClaw Coordinator | 1-2 weeks | Skill installable |
| **Phase 3** | Hermes Skills | 2 weeks | Skill package |
| **Phase 4** | Integration & Release | 1 week | GitHub Release |

---

## 🎯 Goals & Success Metrics

### Core Goals

1. **Graph-Driven Memory** — Multi-dimensional relationship mapping + graph inference
2. **Hybrid Communication** — Graph (stable) + RPC (fast)
3. **Active Push** — Proactively provide insights based on graph reasoning
4. **One-Click Deployment** — Docker Compose setup

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Retrieval Accuracy** | > 85% | User feedback / CTR |
| **Association Discovery** | > 5 per query | Graph inference results |
| **Active Push** | > 3 per day | Push frequency |
| **Push Accuracy** | > 80% | User approval rate |
| **GitHub Stars** | 100+ (3 months) | GitHub stats |
| **Skill Installs** | 50+ users | Install stats |

---

## 📦 Graph Schema

### Node Types

| Label | Properties | Description |
|-------|------------|-------------|
| **User** | id, name, timezone, createdAt | User entity |
| **Diary** | id, date, content, mood, tags | Daily journal |
| **Meeting** | id, title, startTime, decisions | Meeting records |
| **Behavior** | id, type, timestamp, details | User actions |
| **Knowledge** | id, title, category, confidence | Knowledge nodes |

### Relationship Types

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| **HAS_EXPERIENCE** | User → Diary | User has diary entries |
| **ATTENDED_MEETING** | User → Meeting | User attended meeting |
| **PERFORMED_ACTION** | User → Behavior | User performed action |
| **LEARNED_KNOWLEDGE** | User → Knowledge | User learned knowledge |
| **SIMILAR_TO** | Diary → Diary | Diary similarity (vector) |

---

## 🔧 Core Components

### GraphClient SDK

```typescript
class GraphClient {
  // Neo4j Operations
  async query(cypher: string, params?: any): Promise<any>;
  async write(node: Node, relationships?: Relationship[]): Promise<void>;
  
  // Graph Memory Operations
  async search(query: string, topK?: number): Promise<VectorResult[]>;
  async insert(embedding: number[], metadata: any): Promise<void>;
  
  // Event Subscription
  subscribe(eventType: string, handler: EventHandler): void;
}
```

### Example Queries

```cypher
// Query 1: User's last 7 days diaries
MATCH (u:User {id: $userId})-[:HAS_EXPERIENCE]->(d:Diary)
WHERE d.date >= date() - duration({days: 7})
RETURN d ORDER BY d.date DESC;

// Query 2: Path Reasoning (Why low efficiency?)
MATCH path = (u:User)-[*1..3]->(issue)
WHERE issue:HealthRecord OR issue:Meeting
RETURN path LIMIT 10;
```

---

## 📁 Project Structure

```
memory-graph-a2a-openclaw/
├── src/
│   ├── graph-client.ts        # Neo4j + Graph Memory SDK
│   ├── mapper.ts              # Memory → Graph mapping
│   ├── retriever.ts           # Graph retrieval engine
│   ├── fusion.ts              # Vector + Graph fusion
│   ├── reasoning.ts           # Graph inference engine
│   ├── events.ts              # Event notification system
│   ├── embedder.ts            # Text embedding (reused)
│   ├── chunker.ts             # Document chunking (reused)
│   └── llm-client.ts          # LLM client (reused)
├── tests/
│   ├── graph-client.test.ts
│   ├── mapper.test.ts
│   ├── retriever.test.ts
│   ├── fusion.test.ts
│   └── events.test.ts
├── docs/
│   └── schema.md              # Graph schema documentation
├── README.md                  # This file
├── SKILL.md                   # OpenClaw skill definition
├── PR_DESCRIPTION.md          # PR template
├── PR_INSTRUCTIONS.md         # Contribution guide
├── CHECKLIST.md               # Pre-commit checklist
└── CONFIG_SILRA.md            # China API configuration
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Neo4j** 5.0+ (Docker or local)
- **Graph Memory** 0.5+
- **OpenClaw** Gateway running

### Installation

```bash
# Clone the repository
git clone https://github.com/myhearwillgoon/Graph-Memory-Mapping-Skills.git
cd Graph-Memory-Mapping-Skills

# Install dependencies
npm install

# Start Neo4j (Docker)
docker-compose up -d neo4j

# Run tests
npm test
```

### Configuration

See `CONFIG_SILRA.md` for China API provider setup (Silra.cn, etc.)

---

## 📊 Current Progress

**Last Updated**: 2026-04-21

### Overall Status

| Component | Progress | Status |
|-----------|----------|--------|
| **Memory Graph Pro** | 100% | ✅ Complete |
| **OpenClaw Coordinator** | In Progress | 🟡 Developing |
| **Hermes Skills** | In Progress | 🟡 Developing |
| **Integration & Release** | Pending | ⏳ Up Next |

---

### Phase 1: Memory Graph Pro (✅ 100% Complete)

| Task | Status | Notes |
|------|--------|-------|
| MGP-001: Fork memory-graph-a2a | ✅ Complete | Branch: `feat/graph-memory` |
| MGP-002: Reuse core components | ✅ Complete | embedder, chunker, llm-client |
| MGP-003: Design Graph Schema | ✅ Complete | Schema documented in README |
| MGP-004: Implement GraphClient SDK | ✅ Complete | Neo4j + Graph Memory wrapper |
| MGP-005: Memory → Graph Mapper | ✅ Complete | Data mapping logic |
| MGP-006: Graph Retriever | ✅ Complete | Query engine |
| MGP-007: Vector + Graph Fusion | ✅ Complete | Hybrid retrieval |
| MGP-008: Graph Reasoning Engine | ✅ Complete | Path/mode inference |
| MGP-009: Event Notification | ✅ Complete | Pub/sub mechanism |
| MGP-010: Unit Tests | ✅ Complete | >80% coverage |
| MGP-011: README/SKILL.md | ✅ Complete | This document |
| MGP-012: Performance Optimization | ✅ Complete | Query optimization |

**Source Code**: 9 files in `src/` directory  
**Tests**: 5 unit test files in `tests/`  
**Documentation**: Schema, API reference, usage examples

---

### Phase 2: OpenClaw Coordinator (🟡 In Progress)

| Task | Status | Notes |
|------|--------|-------|
| COORD-001: Design Coordinator architecture | 🟡 In Progress | Architecture design |
| COORD-002: Implement Channel Manager | ⏳ Pending | Multi-channel support |
| COORD-003: Implement Task Dispatcher | ⏳ Pending | Priority queue |
| COORD-004: Implement Health Monitor | ⏳ Pending | Heartbeat detection |
| COORD-005: Integrate Memory Graph Pro | ⏳ Pending | GraphClient integration |
| COORD-006: Unit Tests | ⏳ Pending | >80% coverage |
| COORD-007: README/SKILL.md | ⏳ Pending | Documentation |
| COORD-008: Performance Optimization | ⏳ Pending | <100ms dispatch |

---

### Phase 3: Hermes Skills (🟡 In Progress)

| Task | Status | Notes |
|------|--------|-------|
| HERMES-001: Configure Hermes environment | 🟡 In Progress | Setup dev environment |
| HERMES-002: Implement Crawler Skill | ⏳ Pending | File watching / API calls |
| HERMES-003: Implement Parser Skill | ⏳ Pending | Markdown/Meeting parsing |
| HERMES-004: Implement Analyzer Skill | ⏳ Pending | Pattern analysis |
| HERMES-005: Implement Knowledge Skill | ⏳ Pending | Knowledge persistence |
| HERMES-006: Implement Delivery Skill | ⏳ Pending | Push notifications |
| HERMES-007: Integrate GraphClient | ⏳ Pending | Graph access |
| HERMES-008: Unit Tests | ⏳ Pending | >80% coverage |
| HERMES-009: README | ⏳ Pending | Documentation |
| HERMES-010: Performance Optimization | ⏳ Pending | <500ms execution |

---

### Phase 4: Integration & Release (⏳ Up Next)

- End-to-end integration testing
- Docker image build
- Deployment documentation
- GitHub Release preparation

---

## 📚 Documentation

### Spec-Flow Documents

| Document | Location | Status |
|----------|----------|--------|
| **Proposal** | `.spec-flow/active/github-push-proposal/proposal.md` | ✅ Complete |
| **Requirements** | `.spec-flow/active/github-push-proposal/requirements.md` | ✅ Complete |
| **Design** | `.spec-flow/active/github-push-proposal/design.md` | ✅ Complete |
| **Tasks** | `.spec-flow/active/github-push-proposal/tasks.md` | ✅ Complete |

### Key Documents

- **Proposal** — Project background, goals, scope, risks, timeline
- **Requirements** — 46 functional/non-functional requirements (EARS format)
- **Design** — Technical architecture, component design, data models
- **Tasks** — Detailed task breakdown with dependencies

---

## ⚠️ Risks & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Graph query performance | Medium | High | Index optimization, caching, pagination |
| Data consistency | Medium | High | Transactions, versioning, conflict detection |
| Schema evolution | High | Medium | Version control, migration scripts |
| Memory usage | Medium | Medium | Graph partitioning, on-demand loading |

### Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | High | High | Strict Non-Goals, phased delivery |
| Complexity超预期 | Medium | High | Early prototyping, simplified MVP |
| Breaking compatibility | Low | High | Preserve existing API, backward compatible |

---

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create feature branch** (`feat/xxx`)
3. **Implement + Test** (coverage > 80%)
4. **Pre-commit checklist** (see `CHECKLIST.md`)
5. **Submit PR** (use template in `PR_DESCRIPTION.md`)
6. **Code review** → Merge

### Pre-Commit Checklist

- [ ] No sensitive data (API keys, secrets)
- [ ] Unit tests pass
- [ ] Code formatted (Prettier/ESLint)
- [ ] Documentation updated
- [ ] Commit message follows convention

---

## 📅 Timeline

| Phase | Content | Duration | Start | End |
|-------|---------|----------|-------|-----|
| **Proposal** | This document | 1 day | 2026-04-20 | 2026-04-20 |
| **Requirements** | Detailed specs | 2-3 days | TBD | - |
| **Design** | Technical architecture | 3-5 days | TBD | - |
| **Tasks** | Task breakdown | 1-2 days | TBD | - |
| **Phase 1** | Memory Graph Pro | 2-3 weeks | TBD | - |
| **Phase 2** | Coordinator | 1-2 weeks | TBD | - |
| **Phase 3** | Hermes Skills | 2 weeks | TBD | - |
| **Phase 4** | Integration & Release | 1 week | TBD | - |
| **Total** | - | **6-8 weeks** | - | - |

---

## 📄 License

MIT

---

## ☕ Support

[!["Buy Me A Coffee"](https://storage.ko-fi.com/cdn/kofi2.png?v=3)](https://ko-fi.com/aila)

---

## 📱 Contact

<img src="assets/wechat-qrcode.jpeg" width="200" alt="WeChat QR Code" />

---

*Built with 🐉 for multi-agent collaboration*
