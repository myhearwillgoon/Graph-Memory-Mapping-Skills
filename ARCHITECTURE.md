# Graph Multi-Agent System - Architecture & Implementation Guide

> **Graph-Based A2A Communication** — Solving continuity and coherence challenges in multi-agent collaboration

**Version**: 2.0  
**Status**: Phase 1 Complete, Phase 1.5 (Layered Memory) In Design  
**Last Updated**: 2026-04-21

---

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Layered Memory Design](#layered-memory-design)
- [Implementation Status](#implementation-status)
- [Quick Start](#quick-start)
- [Development Roadmap](#development-roadmap)

---

## 🎯 Problem Statement

### The Challenge

Traditional Skill-based A2A (Agent-to-Agent) communication faces critical issues:

1. **Context Loss** — Chain-style communication easily loses context
2. **Inconsistent Output** — No persistent state between agent handoffs
3. **Unreliable Coordination** — Direct RPC coupling leads to fragile chains
4. **No Knowledge Accumulation** — Interactions are transient, not learned

**Real-World Impact**:
> "We can't ensure task output continuity and coherence using Skills. Context is lost between agent handoffs."  
> — Li Yang, Multi-Agent System Lead

---

## 💡 Solution Overview

### Graph-Based Multi-Agent Mapping

Instead of direct Agent-to-Agent communication, we use a **Graph Memory Layer** as the coordination medium:

```
Traditional A2A:
Agent A → Agent B → Agent C (Chain, fragile, context loss)

Graph-Based A2A:
Agent A → Write to Graph Layer (Fact)
    ↓
Inter-Layer Mapping (Automatic Association)
    ↓
Agent B ← Read from Graph Layer (Decision, via mapping)

Benefits:
✅ Persistent Context — All state in graph
✅ Deterministic — Graph mapping, not random calls
✅ Traceable — Full audit trail
✅ Decoupled — Agents don't know each other
```

### Core Innovation

**Layered Graph Memory**:
- Single Neo4j graph (unified memory space)
- Internal layers by category (Fact/Decision/Pattern/Entity/Event)
- Inter-layer mapping for agent coordination
- Agents read/write layers, not each other

---

## 🏗️ System Architecture

### High-Level Architecture

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
│  │  Coordinator Agent                                  │   │
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
│  │ (Input)  │ │(Extract) │ │(Reason)  │ │ (Output) │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │             │
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
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Neo4j Knowledge Graph (Unified Memory)             │   │
│  │  - Layers: Fact, Decision, Pattern, Entity, Event   │   │
│  │  - Inter-Layer Mappings (Explicit Relationships)    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Graph-Centric** | All persistent state written to graph |
| **Layered Memory** | Internal categorization (Fact/Decision/Pattern/Entity/Event) |
| **Inter-Layer Mapping** | Agents coordinate via graph mappings, not direct calls |
| **Event-Driven** | Graph updates trigger events |
| **Modular** | Each Agent/Skill has single responsibility |
| **Extensible** | Add Agents without modifying core |

---

## 🧩 Core Components

### 1. Graph Memory Layer

**Purpose**: Unified memory space for all agents

**Layer Structure**:
```
┌─────────────────────────────────────────┐
│      Unified Graph Memory (Neo4j)       │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ Fact     │  │ Decision │            │
│  │ Layer    │  │ Layer    │            │
│  │ (Data)   │  │ (Plans)  │            │
│  └────┬─────┘  └────┬─────┘            │
│       │             │                   │
│       └──────┬──────┘                   │
│              │                          │
│       Inter-Layer Mapping               │
│       (Explicit Relationships)          │
└─────────────────────────────────────────┘
```

**Node Types**:
- `Memory:Fact` — Objective facts, data, observations
- `Memory:Decision` — Decisions, action plans, conclusions
- `Memory:Pattern` — Patterns, trends, correlations
- `Memory:Entity` — People, organizations, locations
- `Memory:Event` — Meetings, activities, incidents

**Relationship Types**:
- `RELATED_TO` — General association
- `LEADS_TO` — Fact → Decision (causal)
- `DERIVED_FROM` — Pattern ← Facts (inference)
- `TRIGGERED` — Event → Decision
- `ABOUT` — Entity ↔ Any layer

**Example**:
```cypher
// Write Fact
CREATE (f:Memory:Fact {
  id: 'fact-001',
  content: 'CI pipeline failed 3 times today',
  confidence: 0.95,
  layer: 'Fact',
  createdAt: datetime()
})

// Write Decision
CREATE (d:Memory:Decision {
  id: 'decision-001',
  content: 'Rollback to version 1.2.3',
  actionPlan: '...',
  layer: 'Decision',
  createdAt: datetime()
})

// Create Inter-Layer Mapping
CREATE (f)-[:LEADS_TO {confidence: 0.9, createdAt: datetime()}]->(d)
```

---

### 2. Categorizer (Layer Classifier)

**Purpose**: Classify input into appropriate memory layers

**Process**:
```
Input (File/Message)
    ↓
┌─────────────────────────────────────┐
│         Categorizer (LLM)           │
│                                     │
│  Prompt:                            │
│  "Classify this content into layers:│
│   - Fact (data/observations)        │
│   - Decision (plans/conclusions)    │
│   - Pattern (trends/rules)          │
│   - Entity (people/orgs)            │
│   - Event (meetings/incidents)      │
│   Output: [{layer, confidence}]"    │
└─────────────────────────────────────┘
    ↓
Output: [
  {layer: 'Fact', confidence: 0.9},
  {layer: 'Event', confidence: 0.7}
]
```

**Implementation**:
```typescript
class Categorizer {
  private llm: LLMProvider;
  private layers = ['Fact', 'Decision', 'Pattern', 'Entity', 'Event'];
  
  async classify(input: string): Promise<LayerResult[]> {
    const prompt = this.buildPrompt(input);
    const response = await this.llm.generate(prompt, { jsonMode: true });
    return this.parseAndValidate(response);
  }
}
```

---

### 3. Inter-Layer Mapper

**Purpose**: Automatically discover and create cross-layer relationships

**Process**:
```
1. New Node Written to Graph
    ↓
2. Trigger Mapping Process
    ↓
3. Discover Cross-Layer Associations
   - Vector similarity search
   - LLM-based inference
    ↓
4. Create Explicit Relationships
    ↓
5. Agent Discovers via Graph Query
```

**Cypher Example**:
```cypher
// Find Facts leading to Decisions
MATCH (f:Memory:Fact {id: 'fact-001'})-[:LEADS_TO]->(d:Memory:Decision)
RETURN d

// Discover Potential Associations (Vector + Graph)
MATCH (f:Memory:Fact {id: 'fact-001'})
WITH f.embedding AS query_embedding
CALL db.index.vector.queryNodes(
  'decision_embeddings', 
  5, 
  query_embedding
) YIELD node, score
WHERE score > 0.7
CREATE (f)-[:RELATED_TO {score: score}]->(node)
```

---

### 4. Agent Workspace (Shared)

**Purpose**: Shared graph workspace with layer-based views

**Design**:
```
┌─────────────────────────────────────────┐
│      Shared Graph Workspace             │
│      (Full Graph, No Isolation)         │
└─────────────────────────────────────────┘
         ↓                  ↓
┌────────────────┐  ┌────────────────┐
│ Crawler View   │  │ Analyzer View  │
│ (Input layers) │  │ (Analysis)     │
└────────────────┘  └────────────────┘
```

**View Definition**:
```typescript
interface AgentView {
  agentId: string;
  role: AgentRole;
  allowedLayers: string[];  // e.g., ['Fact', 'Event']
  maxDepth: number;  // Relationship depth limit
}
```

---

## 📊 Layered Memory Design

### Why Layered Memory?

**Previous Approach (3-Tier Memory)**:
```
Working Memory (Short-term)
    ↓ Promote
Episodic Memory (Session-level)
    ↓ Consolidate
Semantic Memory (Long-term Graph)

Problems:
❌ Complex management (3 layers + promotion + consolidation)
❌ Hard to isolate for Hermes Agents (shared workspace)
❌ Layer barriers impede information flow
```

**Current Approach (Layered Graph Memory)**:
```
Unified Graph Memory
    ↓
Internal Layers by Category
    ↓
Inter-Layer Mapping for Coordination

Benefits:
✅ Simple architecture (single graph)
✅ Fits Hermes Agent shared workspace
✅ Flexible layering (dynamic, not fixed time windows)
✅ Lower implementation cost (7 days vs 11 days)
```

### Layer Categories

| Layer | Purpose | Example | Retention |
|-------|---------|---------|-----------|
| **Fact** | Objective data/observations | "CI failed 3 times" | Permanent |
| **Decision** | Plans/conclusions/actions | "Rollback to v1.2.3" | Permanent |
| **Pattern** | Trends/correlations/rules | "Fails after deploys" | Permanent |
| **Entity** | People/orgs/locations | "DevOps Team", "GitHub" | Permanent |
| **Event** | Meetings/incidents/activities | "Build failure at 14:00" | Permanent |

### Inter-Layer Communication

**Agent A (Crawler)**:
1. Detects CI failure
2. Categorizer → Fact layer + Event layer
3. Writes to graph:
   - Fact: "CI pipeline failed"
   - Event: "Build failure at 14:00"

**Automatic Inter-Layer Mapping**:
- Discovers similar historical failures (Pattern layer)
- Finds related past decisions (Decision layer)
- Creates cross-layer relationships

**Agent B (Analyzer)**:
1. Queries Event layer: "Build failure"
2. Discovers via inter-layer mappings:
   - Related Facts (failure details)
   - Related Patterns (historical trends)
   - Related Decisions (past solutions)
3. Analyzes root cause

**Key**: Agent A and Agent B never communicate directly. They coordinate through inter-layer mappings.

---

## ✅ Implementation Status

### Phase 1: Memory Graph Pro (Complete)

| Component | Status | Files |
|-----------|--------|-------|
| GraphClient SDK | ✅ Complete | `src/graph-client.ts` |
| Memory Mapper | ✅ Complete | `src/mapper.ts` |
| Graph Retriever | ✅ Complete | `src/retriever.ts` |
| Hybrid Fusion | ✅ Complete | `src/fusion.ts` |
| Graph Reasoning | ✅ Complete | `src/reasoning.ts` |
| Event System | ✅ Complete | `src/events.ts` |

**Code Stats**:
- 11 core TypeScript modules
- 6 test files
- ~3,800 LOC
- 70%+ test coverage

**GitHub**: https://github.com/myhearwillgoon/Graph-Memory-Mapping-Skills

---

### Phase 1.5: Layered Memory & Inter-Layer Mapping (In Design)

| Component | Status | ETA |
|-----------|--------|-----|
| Categorizer | 📝 Design | 2 days |
| Layer Mapper | 📝 Design | 2 days |
| Layered Query | 📝 Design | 2 days |
| Inter-Layer Relations | 📝 Design | 1 day |

**Total ETA**: ~7 days

---

### Phase 2: OpenClaw Coordinator (Pending)

- Channel Manager
- Task Dispatcher
- Health Monitor
- Graph Memory Integration

**ETA**: 1-2 weeks

---

### Phase 3: Hermes Skills (Pending)

- Crawler Skill
- Parser Skill
- Analyzer Skill
- Knowledge Skill
- Delivery Skill

**ETA**: 2 weeks

---

### Phase 4: Integration & Release (Pending)

- End-to-End Testing
- Docker Image
- GitHub Release

**ETA**: 1 week

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Neo4j 5.x (local or cloud)
# Docker (optional)
docker --version
```

### Installation

```bash
# Clone the repository
git clone https://github.com/myhearwillgoon/Graph-Memory-Mapping-Skills.git
cd Graph-Memory-Mapping-Skills

# Install dependencies
npm install

# Configure Neo4j
cp .env.example .env
# Edit with your Neo4j credentials
```

### Usage Example

```typescript
import { GraphClient } from './src/graph-client';
import { Categorizer } from './src/categorizer';
import { LayerMapper } from './src/layer-mapper';

// Initialize
const graph = new GraphClient({
  neo4jUri: process.env.NEO4J_URI,
  neo4jUser: process.env.NEO4J_USER,
  neo4jPassword: process.env.NEO4J_PASSWORD
});

const categorizer = new Categorizer(llmProvider);
const mapper = new LayerMapper(graph, embedder);

// Process input
const input = "CI pipeline failed 3 times today";

// 1. Classify into layers
const layers = await categorizer.classify(input);
// Output: [{layer: 'Fact', confidence: 0.9}, {layer: 'Event', confidence: 0.7}]

// 2. Write to graph
const node = await graph.write({
  label: 'Memory',
  layers: layers.map(l => l.layer),
  content: input,
  ...
});

// 3. Trigger inter-layer mapping
await mapper.createMappings(node);

// 4. Query related nodes
const related = await graph.query(`
  MATCH (n:Memory {id: $nodeId})-[:RELATED_TO|LEADS_TO]-(related)
  RETURN related
`, { nodeId: node.id });
```

---

## 📅 Development Roadmap

### Q2 2026

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| W1-2 | Phase 1.5 Design | Requirements + Design docs |
| W3-4 | Phase 1.5 Implementation | Categorizer + Layer Mapper |
| W5-6 | Phase 2 Implementation | OpenClaw Coordinator |
| W7-8 | Phase 3 Implementation | Hermes Skills |
| W9 | Phase 4 Integration | End-to-End Testing |
| W10 | GitHub Release | v1.0.0 |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Layer Classification Accuracy | > 90% | LLM vs Human labeling |
| Mapping Discovery Rate | > 85% | Discovered vs Actual |
| Mapping Latency | < 200ms | Input to mapping complete |
| Agent Coordination Efficiency | > 80% | Task completion quality |

---

## 📚 Documentation

| Document | Location |
|----------|----------|
| Proposal | `.spec-flow/active/github-push-proposal/proposal.md` |
| Requirements | `.spec-flow/active/github-push-proposal/requirements.md` |
| Design | `.spec-flow/active/github-push-proposal/design.md` |
| Layered Memory Proposal | `.spec-flow/active/triple-memory-graph-activation/proposal.md` |
| API Reference | `docs/api-reference.md` |
| Development Guide | `docs/development.md` |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **GitHub**: https://github.com/myhearwillgoon/Graph-Memory-Mapping-Skills
- **Issues**: https://github.com/myhearwillgoon/Graph-Memory-Mapping-Skills/issues
- **Discord**: [Join our community](https://discord.gg/clawd)

---

**Built with** 🐉 **for deterministic multi-agent collaboration**

*Last Updated: 2026-04-21*
