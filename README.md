# Graph Memory Mapping Skills

> **Graph-Enhanced Agent-to-Agent Communication** — Neo4j-powered knowledge graph for multi-agent collaboration

**Version**: 1.0.0  
**Status**: ✅ Phase 1 Complete (Memory Graph Pro)  
**Next**: Phase 2 - OpenClaw Coordinator Integration

---

## 🎯 What is Graph Memory Mapping?

**Graph Memory Mapping** transforms how AI agents collaborate by using a **centralized knowledge graph** as the source of truth for inter-agent communication.

Instead of agents communicating through fragile point-to-point RPC calls, all agents read from and write to a **shared graph memory layer**. This enables:

- **Persistent Context** — Agents share long-term memory, not just transient messages
- **Graph-Based Reasoning** — Discover hidden relationships across agent conversations
- **Event-Driven Coordination** — Agents react to graph changes, not just direct calls
- **Multi-Hop Inference** — Chain reasoning across multiple agents' knowledge

---

## 🧠 Graph Reasoning Capabilities

### Core Reasoning Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Path Traversal** | Find connections between entities | "How is Project A related to Client B?" |
| **Pattern Matching** | Detect recurring structures | "Identify all blocked tasks waiting on external deps" |
| **Temporal Reasoning** | Track changes over time | "Show evolution of requirement X" |
| **Causal Inference** | Trace cause-effect chains | "Why did deployment fail?" |
| **Semantic Similarity** | Combine vector + graph search | "Find similar past incidents" |

### Example: Multi-Agent Problem Solving

```
Scenario: User asks "Why did the CI pipeline fail?"

1. Crawler Agent → Detects CI failure event → Writes to graph
2. Parser Agent → Extracts error logs → Links to commit/graph
3. Analyzer Agent → Queries graph for related changes
   - Finds: Recent dependency update (from Git agent)
   - Finds: Similar failure last week (from Memory agent)
   - Infers: Causal relationship via graph path
4. Knowledge Agent → Stores root cause analysis
5. Delivery Agent → Pushes diagnosis to user

All coordination happens through graph events, not RPC!
```

---

## 🔄 A2A Communication Workflow

### Traditional A2A (Point-to-Point)

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Agent A │────▶│ Agent B │────▶│ Agent C │
└─────────┘     └─────────┘     └─────────┘
   │               │               │
   ▼               ▼               ▼
 Direct calls    Direct calls    Direct calls
   │               │               │
   ▼               ▼               ▼
 Tight coupling  Brittle chain   Hard to scale
```

**Problems**:
- ❌ Tight coupling between agents
- ❌ Communication chain breaks if one agent fails
- ❌ No persistent context across conversations
- ❌ Hard to add new agents

---

### Graph-Enabled A2A (Event-Driven)

```
                        ┌─────────────────┐
                        │   Graph Memory  │
                        │   (Neo4j)       │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌─────────┐        ┌─────────┐        ┌─────────┐
        │Crawler  │        │Analyzer │        │Delivery │
        │Agent    │        │Agent    │        │Agent    │
        └────┬────┘        └────┬────┘        └────┬────┘
             │                  │                  │
             │  Write Events    │  Read/Query      │  Subscribe
             │                  │                  │
             └──────────────────┴──────────────────┘
                        Graph Events
```

**Benefits**:
- ✅ **Loose coupling** — Agents only know the graph schema
- ✅ **Fault tolerance** — One agent failure doesn't break chain
- ✅ **Persistent context** — Graph retains full conversation history
- ✅ **Easy scaling** — Add new agents by subscribing to events

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
│  │  - Routes user messages to appropriate agent        │   │
│  │  - Monitors agent health                            │   │
│  │  - Manages conversation context via graph           │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Graph Events
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Hermes Agent Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Crawler  │ │ Parser   │ │ Analyzer │ │Delivery  │      │
│  │ (Input)  │ │(Extract) │ │(Reason)  │ │ (Output) │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │             │
│       └────────────┴────────────┴────────────┘             │
│                         │                                   │
│                         ▼                                   │
│              ┌─────────────────────┐                       │
│              │   GraphClient SDK   │                       │
│              │   (Neo4j Driver)    │                       │
│              └─────────────────────┘                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Graph Memory Layer                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Neo4j Knowledge Graph                              │   │
│  │  - Nodes: Entities, Concepts, Events                │   │
│  │  - Relationships: CAUSES, RELATES_TO, OCCURS_AFTER  │   │
│  │  - Properties: Timestamps, Confidence, Source       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Component Breakdown

### Phase 1: Memory Graph Pro ✅ (Complete)

**Location**: `Graph-Memory-Reflection-Skills/memory-lancedb-pro-openclaw/`

| Module | File | Function |
|--------|------|----------|
| **Graph Client** | `src/graph-client.ts` | Neo4j connection + query execution |
| **Mapper** | `src/mapper.ts` | Convert memory → graph nodes/relationships |
| **Retriever** | `src/retriever.ts` | Graph traversal + pattern matching |
| **Fusion** | `src/fusion.ts` | Combine vector + graph results |
| **Reasoning** | `src/reasoning.ts` | Path inference + causal analysis |
| **Events** | `src/events.ts` | Event emission on graph changes |

**Key Features**:
- ✅ Neo4j driver integration
- ✅ Hybrid search (vector + graph)
- ✅ Event-driven notifications
- ✅ Graph-based reasoning engine

---

### Phase 2: OpenClaw Coordinator 🚧 (Upcoming)

**Purpose**: Central orchestration layer for multi-agent workflows

**Responsibilities**:
- Channel management (Feishu, WeChat, Email)
- Task dispatching to appropriate agents
- Health monitoring + auto-recovery
- Graph context management

---

### Phase 3: Hermes Skills 🚧 (Upcoming)

**Agent Portfolio**:
1. **Crawler** — Input from channels, file watching
2. **Parser** — Extract structured data from raw input
3. **Analyzer** — Graph-based reasoning + inference
4. **Knowledge** — Long-term memory + caching
5. **Delivery** — Output formatting + push notifications

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Neo4j 5.x (local or cloud)
# Docker (optional, for containerized deployment)
docker --version
```

### Installation

```bash
# Clone the repository
git clone https://github.com/myhearwillgoon/Graph-Memory-Mapping-Skills.git
cd Graph-Memory-Mapping-Skills

# Install dependencies
npm install

# Configure Neo4j connection
cp .env.example .env
# Edit .env with your Neo4j credentials
```

### Usage Example

```typescript
import { GraphClient } from './src/graph-client';
import { MemoryMapper } from './src/mapper';

// Initialize graph client
const graph = new GraphClient({
  url: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'your-password'
});

// Map a memory to graph
const mapper = new MemoryMapper(graph);
await mapper.mapMemory({
  id: 'mem-001',
  content: 'User asked about CI failure',
  entities: ['CI', 'Pipeline', 'Error'],
  relationships: [{ from: 'User', to: 'CI', type: 'ASKED_ABOUT' }]
});

// Query the graph
const results = await graph.runQuery(`
  MATCH (m:Memory {id: 'mem-001'})-[:RELATED_TO]->(related)
  RETURN related
`);
```

---

## 📊 Graph Schema

### Node Types

| Label | Description | Properties |
|-------|-------------|------------|
| `Memory` | Base memory unit | id, content, timestamp, source |
| `Entity` | Named entity | name, type, confidence |
| `Event` | Occurred event | type, timestamp, actors |
| `Concept` | Abstract concept | name, category, definition |

### Relationship Types

| Type | Direction | Meaning |
|------|-----------|---------|
| `RELATED_TO` | Bidirectional | General association |
| `CAUSES` | Unidirectional | Causal relationship |
| `OCCURS_AFTER` | Unidirectional | Temporal sequence |
| `MENTIONS` | Unidirectional | Reference to entity |
| `DERIVED_FROM` | Unidirectional | Inference source |

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run specific test suite
npm test -- tests/graph-client.test.ts

# Run with coverage
npm test -- --coverage
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Schema Design](docs/schema.md) | Graph schema + relationship types |
| [API Reference](docs/api-reference.md) | GraphClient API documentation |
| [Development Guide](docs/development.md) | Setup + contribution guidelines |

---

## 🎯 Use Cases

### 1. Multi-Agent Customer Support

**Scenario**: Customer reports a bug

```
1. Crawler → Receives ticket from Feishu/Email
2. Parser → Extracts: product, version, error message
3. Analyzer → Queries graph:
   - Similar bugs? (pattern match)
   - Recent changes? (temporal query)
   - Affected users? (path traversal)
4. Knowledge → Stores diagnosis
5. Delivery → Sends solution to customer
```

**Graph Value**: Connects bug report to code changes, past incidents, and affected users — all through graph traversal.

---

### 2. Research Assistant

**Scenario**: User asks "What's the relationship between Project A and Client B?"

```
1. Analyzer → Runs graph query:
   MATCH (p:Project {name: 'A'})-[*1..3]-(c:Client {name: 'B'})
   RETURN p, c, relationships
   
2. Graph returns:
   - Project A → uses → Library X
   - Library X → developed by → Company Y
   - Company Y → acquired by → Client B
   
3. Delivery → Explains: "Project A depends on Library X, which Client B now owns"
```

**Graph Value**: Multi-hop reasoning discovers indirect relationships that vector search would miss.

---

### 3. Incident Response

**Scenario**: Production deployment fails

```
Graph enables:
- Trace failure to recent code change (CAUSES relationship)
- Find similar past incidents (pattern match)
- Identify affected services (path traversal)
- Notify responsible teams (event subscription)
```

**Graph Value**: Real-time event-driven coordination across monitoring, analysis, and communication agents.

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

**Built with** 🐉 **for multi-agent collaboration**
