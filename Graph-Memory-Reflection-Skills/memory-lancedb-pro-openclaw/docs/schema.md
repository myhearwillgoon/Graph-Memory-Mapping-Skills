# Memory Graph Pro - Graph Schema Design

## 概述

本文档定义 Memory Graph Pro 的图数据库 Schema，基于 Neo4j 实现知识图谱存储。

---

## 1. 节点类型 (Node Labels)

### 1.1 User (用户节点)
```cypher
(:User {
  id: string,           // 唯一标识符
  name: string,         // 用户名称
  email: string,        // 邮箱地址
  timezone: string,     // 时区 (e.g., "Asia/Shanghai")
  preferences: Map,     // 用户偏好配置
  createdAt: DateTime,  // 创建时间
  updatedAt: DateTime   // 更新时间
})
```

**索引**:
- `CREATE CONSTRAINT user_id FOR (u:User) REQUIRE u.id IS UNIQUE`
- `CREATE INDEX user_email FOR (u:User) ON (u.email)`

### 1.2 Memory (记忆节点)
```cypher
(:Memory {
  id: string,           // 唯一标识符
  type: string,         // 记忆类型: fact, preference, entity, decision, pattern
  content: string,      // 记忆内容
  summary: string,      // 内容摘要
  embedding: List,      // 向量嵌入 [number[]]
  confidence: float,    // 置信度 0.0-1.0
  source: string,       // 来源
  scope: string,        // 作用域: global, agent:<id>, custom:<name>
  createdAt: DateTime,  // 创建时间
  updatedAt: DateTime,  // 更新时间
  accessedAt: DateTime, // 最后访问时间
  accessCount: int,     // 访问次数
  tier: string          // 层级: core, working, peripheral
})
```

**索引**:
- `CREATE CONSTRAINT memory_id FOR (m:Memory) REQUIRE m.id IS UNIQUE`
- `CREATE INDEX memory_type FOR (m:Memory) ON (m.type)`
- `CREATE INDEX memory_scope FOR (m:Memory) ON (m.scope)`
- `CREATE INDEX memory_tier FOR (m:Memory) ON (m.tier)`

### 1.3 Diary (日记节点)
```cypher
(:Diary {
  id: string,           // 唯一标识符
  date: Date,           // 日记日期
  content: string,      // 日记内容
  mood: string,         // 心情状态
  tags: List,           // 标签列表
  weather: string,      // 天气
  location: string,     // 地点
  createdAt: DateTime,  // 创建时间
  embedding: List       // 向量嵌入
})
```

**索引**:
- `CREATE CONSTRAINT diary_id FOR (d:Diary) REQUIRE d.id IS UNIQUE`
- `CREATE INDEX diary_date FOR (d:Diary) ON (d.date)`

### 1.4 Meeting (会议节点)
```cypher
(:Meeting {
  id: string,           // 唯一标识符
  title: string,        // 会议标题
  startTime: DateTime,  // 开始时间
  endTime: DateTime,    // 结束时间
  participants: List,   // 参与者列表
  agenda: string,       // 议程
  content: string,      // 会议内容/纪要
  decisions: List,      // 决策事项
  actionItems: List,    // 行动项
  createdAt: DateTime,  // 创建时间
  embedding: List       // 向量嵌入
})
```

**索引**:
- `CREATE CONSTRAINT meeting_id FOR (m:Meeting) REQUIRE m.id IS UNIQUE`
- `CREATE INDEX meeting_start_time FOR (m:Meeting) ON (m.startTime)`

### 1.5 Behavior (行为节点)
```cypher
(:Behavior {
  id: string,           // 唯一标识符
  type: string,         // 行为类型
  timestamp: DateTime,  // 发生时间
  details: Map,         // 行为详情
  duration: int,        // 持续时间(秒)
  metadata: Map,        // 附加元数据
  createdAt: DateTime   // 创建时间
})
```

**索引**:
- `CREATE CONSTRAINT behavior_id FOR (b:Behavior) REQUIRE b.id IS UNIQUE`
- `CREATE INDEX behavior_type FOR (b:Behavior) ON (b.type)`
- `CREATE INDEX behavior_timestamp FOR (b:Behavior) ON (b.timestamp)`

### 1.6 Knowledge (知识节点)
```cypher
(:Knowledge {
  id: string,           // 唯一标识符
  title: string,        // 知识标题
  category: string,     // 知识分类
  content: string,      // 知识内容
  confidence: float,    // 置信度
  source: string,       // 知识来源
  tags: List,           // 标签
  createdAt: DateTime,  // 创建时间
  updatedAt: DateTime,  // 更新时间
  embedding: List       // 向量嵌入
})
```

**索引**:
- `CREATE CONSTRAINT knowledge_id FOR (k:Knowledge) REQUIRE k.id IS UNIQUE`
- `CREATE INDEX knowledge_category FOR (k:Knowledge) ON (k.category)`

### 1.7 Entity (实体节点)
```cypher
(:Entity {
  id: string,           // 唯一标识符
  name: string,         // 实体名称
  type: string,         // 实体类型: person, organization, location, concept
  aliases: List,        // 别名列表
  properties: Map,      // 属性
  createdAt: DateTime,  // 创建时间
  embedding: List       // 向量嵌入
})
```

**索引**:
- `CREATE CONSTRAINT entity_id FOR (e:Entity) REQUIRE e.id IS UNIQUE`
- `CREATE INDEX entity_name FOR (e:Entity) ON (e.name)`
- `CREATE INDEX entity_type FOR (e:Entity) ON (e.type)`

---

## 2. 关系类型 (Relationship Types)

### 2.1 用户关联关系

#### HAS_MEMORY (用户拥有记忆)
```cypher
(u:User)-[:HAS_MEMORY {createdAt: DateTime}]->(m:Memory)
```

#### WROTE_DIARY (用户写日记)
```cypher
(u:User)-[:WROTE_DIARY {createdAt: DateTime}]->(d:Diary)
```

#### ATTENDED_MEETING (用户参加会议)
```cypher
(u:User)-[:ATTENDED_MEETING {role: string, createdAt: DateTime}]->(m:Meeting)
```

#### PERFORMED_BEHAVIOR (用户执行行为)
```cypher
(u:User)-[:PERFORMED_BEHAVIOR {createdAt: DateTime}]->(b:Behavior)
```

#### HAS_KNOWLEDGE (用户拥有知识)
```cypher
(u:User)-[:HAS_KNOWLEDGE {createdAt: DateTime, source: string}]->(k:Knowledge)
```

### 2.2 记忆关联关系

#### RELATED_TO (记忆相关联)
```cypher
(m1:Memory)-[:RELATED_TO {
  similarity: float,      // 相似度分数
  relationType: string,   // 关系类型
  createdAt: DateTime
}]->(m2:Memory)
```

#### DERIVED_FROM (派生自)
```cypher
(m1:Memory)-[:DERIVED_FROM {createdAt: DateTime}]->(m2:Memory)
```

#### SUPERCEDES (替代/更新)
```cypher
(m1:Memory)-[:SUPERCEDES {createdAt: DateTime, reason: string}]->(m2:Memory)
```

### 2.3 实体关联关系

#### MENTIONS_ENTITY (提及实体)
```cypher
(m:Memory|Diary|Meeting)-[:MENTIONS_ENTITY {
  confidence: float,
  mentionCount: int,
  createdAt: DateTime
}]->(e:Entity)
```

#### RELATED_ENTITY (实体相关)
```cypher
(e1:Entity)-[:RELATED_ENTITY {
  relationType: string,
  confidence: float,
  createdAt: DateTime
}]->(e2:Entity)
```

### 2.4 时间关联关系

#### HAPPENED_AFTER (发生在之后)
```cypher
(m1:Meeting|Diary|Behavior)-[:HAPPENED_AFTER]->(m2:Meeting|Diary|Behavior)
```

#### NEXT_DIARY (下一篇日记)
```cypher
(d1:Diary)-[:NEXT_DIARY]->(d2:Diary)
```

---

## 3. 常用查询模式

### 3.1 用户最近 7 天日记
```cypher
MATCH (u:User {id: $userId})-[:WROTE_DIARY]->(d:Diary)
WHERE d.date >= date() - duration({days: 7})
RETURN d ORDER BY d.date DESC
```

### 3.2 用户核心记忆
```cypher
MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
WHERE m.tier = 'core'
RETURN m ORDER BY m.accessedAt DESC
LIMIT 20
```

### 3.3 相关记忆路径
```cypher
MATCH path = (m1:Memory {id: $memoryId})-[:RELATED_TO*1..3]->(m2:Memory)
WHERE m2.confidence >= 0.7
RETURN path, m2
LIMIT 10
```

### 3.4 实体关联网络
```cypher
MATCH (e:Entity {name: $entityName})<-[:MENTIONS_ENTITY]-(m:Memory)-[:RELATED_TO*1..2]->(related:Memory)
RETURN e, m, related
LIMIT 20
```

### 3.5 用户行为模式
```cypher
MATCH (u:User {id: $userId})-[:PERFORMED_BEHAVIOR]->(b:Behavior)
WHERE b.timestamp >= datetime() - duration({days: 30})
WITH b.type as behaviorType, count(b) as frequency
RETURN behaviorType, frequency
ORDER BY frequency DESC
```

---

## 4. 向量检索集成

### 4.1 Graph Memory 表结构
```typescript
interface VectorRecord {
  id: string;           // 与 Neo4j 节点 id 一致
  embedding: Float32Array;  // 向量嵌入
  nodeType: string;     // 节点类型
  content: string;      // 原始内容
  metadata: {
    userId?: string;
    createdAt: string;
    confidence: number;
  };
}
```

### 4.2 混合检索流程
1. 向量检索 (Graph Memory): 语义相似度搜索
2. 图谱检索 (Neo4j): 关系路径查询
3. 融合排序: RRF (Reciprocal Rank Fusion)

---

## 5. 生命周期管理

### 5.1 记忆层级
- **Core**: 核心记忆，永不遗忘，β=0.8, floor=0.9
- **Working**: 工作记忆，β=1.0, floor=0.7
- **Peripheral**: 边缘记忆，β=1.3, floor=0.5

### 5.2 升级/降级规则
```cypher
// 升级为核心记忆
MATCH (m:Memory)
WHERE m.accessCount > 50 AND m.confidence > 0.9
SET m.tier = 'core'

// 降级为边缘记忆
MATCH (m:Memory)
WHERE m.accessCount < 5 AND m.createdAt < datetime() - duration({days: 30})
SET m.tier = 'peripheral'
```

---

*文档版本: 1.0*
*最后更新: 2026-04-20*
