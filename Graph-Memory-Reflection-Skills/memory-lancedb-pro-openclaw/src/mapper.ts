/**
 * Memory to Graph Mapper
 * 
 * Maps memory-graph-a2a records to Neo4j graph nodes and Graph Memory vectors.
 */

import { GraphClient, Node, Relationship, VectorRecord } from './graph-client';
import { EmbeddingProvider, LLMProvider } from '../types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface MemoryRecord {
  id: string;
  type: 'fact' | 'preference' | 'entity' | 'decision' | 'pattern';
  content: string;
  summary?: string;
  confidence?: number;
  source?: string;
  scope?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface DiaryRecord {
  id: string;
  date: string;
  content: string;
  mood?: string;
  tags?: string[];
  weather?: string;
  location?: string;
  userId?: string;
}

export interface MeetingRecord {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  participants?: string[];
  agenda?: string;
  content?: string;
  decisions?: string[];
  actionItems?: string[];
  userId?: string;
}

export interface BehaviorRecord {
  id: string;
  type: string;
  timestamp: string;
  details: Record<string, any>;
  duration?: number;
  metadata?: Record<string, any>;
  userId?: string;
}

export interface KnowledgeRecord {
  id: string;
  title: string;
  category: string;
  content: string;
  confidence?: number;
  source?: string;
  tags?: string[];
  userId?: string;
}

export interface EntityRecord {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept';
  aliases?: string[];
  properties?: Record<string, any>;
  userId?: string;
}

export interface MappingResult {
  nodeId: string;
  vectorId?: string;
  relationships: string[];
  success: boolean;
  error?: string;
}

// ============================================================================
// MemoryGraphMapper Class
// ============================================================================

export class MemoryGraphMapper {
  private client: GraphClient;
  private embedder: EmbeddingProvider;
  private llm?: LLMProvider;

  constructor(
    client: GraphClient,
    embedder: EmbeddingProvider,
    llm?: LLMProvider
  ) {
    this.client = client;
    this.embedder = embedder;
    this.llm = llm;
  }

  // ============================================================================
  // Memory Mapping
  // ============================================================================

  /**
   * Map a memory record to graph nodes and vectors
   */
  async mapMemory(record: MemoryRecord): Promise<MappingResult> {
    try {
      const nodeId = record.id;
      const embedding = await this.generateEmbedding(record.content);

      // Create Memory node in Neo4j
      const memoryNode: Node = {
        id: nodeId,
        label: 'Memory',
        properties: {
          type: record.type,
          content: record.content,
          summary: record.summary || await this.generateSummary(record.content),
          confidence: record.confidence ?? 0.8,
          source: record.source || 'memory-pro',
          scope: record.scope || 'global',
          tier: 'working',
          createdAt: record.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: record.updatedAt?.toISOString() || new Date().toISOString(),
          accessCount: 0,
        },
      };

      await this.client.createNode(memoryNode, true);

      // Create User relationship if userId provided
      const relationships: string[] = [];
      if (record.userId) {
        await this.ensureUserExists(record.userId);
        await this.client.createRelationship({
          type: 'HAS_MEMORY',
          sourceId: record.userId,
          targetId: nodeId,
          properties: { createdAt: new Date().toISOString() },
        });
        relationships.push(`HAS_MEMORY:${record.userId}`);
      }

      // Insert vector record
      await this.client.insertVector({
        id: nodeId,
        embedding: embedding,
        nodeType: 'Memory',
        content: record.content,
        metadata: {
          userId: record.userId,
          type: record.type,
          confidence: record.confidence ?? 0.8,
          createdAt: memoryNode.properties.createdAt,
        },
      });

      // Extract and link entities if LLM available
      if (this.llm) {
        const entities = await this.extractEntities(record.content);
        for (const entity of entities) {
          await this.linkEntityToMemory(nodeId, entity);
          relationships.push(`MENTIONS_ENTITY:${entity.id}`);
        }
      }

      logger.debug(`[Mapper] Mapped memory: ${nodeId}`);

      return {
        nodeId,
        vectorId: nodeId,
        relationships,
        success: true,
      };
    } catch (error) {
      logger.error('[Mapper] Failed to map memory:', error);
      return {
        nodeId: record.id,
        relationships: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Map a diary record
   */
  async mapDiary(record: DiaryRecord): Promise<MappingResult> {
    try {
      const nodeId = record.id;
      const embedding = await this.generateEmbedding(record.content);

      const diaryNode: Node = {
        id: nodeId,
        label: 'Diary',
        properties: {
          date: record.date,
          content: record.content,
          mood: record.mood || 'neutral',
          tags: record.tags || [],
          weather: record.weather || 'unknown',
          location: record.location || 'unknown',
          createdAt: new Date().toISOString(),
        },
      };

      await this.client.createNode(diaryNode, true);

      const relationships: string[] = [];

      // Link to user
      if (record.userId) {
        await this.ensureUserExists(record.userId);
        await this.client.createRelationship({
          type: 'WROTE_DIARY',
          sourceId: record.userId,
          targetId: nodeId,
          properties: { createdAt: new Date().toISOString() },
        });
        relationships.push(`WROTE_DIARY:${record.userId}`);
      }

      // Insert vector
      await this.client.insertVector({
        id: nodeId,
        embedding,
        nodeType: 'Diary',
        content: record.content,
        metadata: {
          userId: record.userId,
          date: record.date,
          mood: record.mood,
        },
      });

      // Link to previous diary
      if (record.userId) {
        const previousDiary = await this.findPreviousDiary(record.userId, record.date);
        if (previousDiary) {
          await this.client.createRelationship({
            type: 'NEXT_DIARY',
            sourceId: previousDiary,
            targetId: nodeId,
            properties: {},
          });
          relationships.push(`NEXT_DIARY:${previousDiary}`);
        }
      }

      logger.debug(`[Mapper] Mapped diary: ${nodeId}`);

      return {
        nodeId,
        vectorId: nodeId,
        relationships,
        success: true,
      };
    } catch (error) {
      logger.error('[Mapper] Failed to map diary:', error);
      return {
        nodeId: record.id,
        relationships: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Map a meeting record
   */
  async mapMeeting(record: MeetingRecord): Promise<MappingResult> {
    try {
      const nodeId = record.id;
      const content = `${record.title}\n${record.agenda || ''}\n${record.content || ''}`;
      const embedding = await this.generateEmbedding(content);

      const meetingNode: Node = {
        id: nodeId,
        label: 'Meeting',
        properties: {
          title: record.title,
          startTime: record.startTime,
          endTime: record.endTime || null,
          participants: record.participants || [],
          agenda: record.agenda || '',
          content: record.content || '',
          decisions: record.decisions || [],
          actionItems: record.actionItems || [],
          createdAt: new Date().toISOString(),
        },
      };

      await this.client.createNode(meetingNode, true);

      const relationships: string[] = [];

      // Link participants
      if (record.participants) {
        for (const participant of record.participants) {
          // Try to find user by email or name
          const userId = await this.findUserByEmailOrName(participant);
          if (userId) {
            await this.client.createRelationship({
              type: 'ATTENDED_MEETING',
              sourceId: userId,
              targetId: nodeId,
              properties: { role: 'participant', createdAt: new Date().toISOString() },
            });
            relationships.push(`ATTENDED_MEETING:${userId}`);
          }
        }
      }

      // Insert vector
      await this.client.insertVector({
        id: nodeId,
        embedding,
        nodeType: 'Meeting',
        content,
        metadata: {
          title: record.title,
          startTime: record.startTime,
          participants: record.participants || [],
        },
      });

      // Link to user if provided
      if (record.userId) {
        await this.ensureUserExists(record.userId);
        await this.client.createRelationship({
          type: 'ATTENDED_MEETING',
          sourceId: record.userId,
          targetId: nodeId,
          properties: { role: 'organizer', createdAt: new Date().toISOString() },
        });
        relationships.push(`ATTENDED_MEETING:${record.userId}`);
      }

      logger.debug(`[Mapper] Mapped meeting: ${nodeId}`);

      return {
        nodeId,
        vectorId: nodeId,
        relationships,
        success: true,
      };
    } catch (error) {
      logger.error('[Mapper] Failed to map meeting:', error);
      return {
        nodeId: record.id,
        relationships: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Map a behavior record
   */
  async mapBehavior(record: BehaviorRecord): Promise<MappingResult> {
    try {
      const nodeId = record.id;

      const behaviorNode: Node = {
        id: nodeId,
        label: 'Behavior',
        properties: {
          type: record.type,
          timestamp: record.timestamp,
          details: JSON.stringify(record.details || {}),
          duration: record.duration || 0,
          metadata: JSON.stringify(record.metadata || {}),
          createdAt: new Date().toISOString(),
        },
      };

      await this.client.createNode(behaviorNode, true);

      const relationships: string[] = [];

      // Link to user
      if (record.userId) {
        await this.ensureUserExists(record.userId);
        await this.client.createRelationship({
          type: 'PERFORMED_BEHAVIOR',
          sourceId: record.userId,
          targetId: nodeId,
          properties: { createdAt: new Date().toISOString() },
        });
        relationships.push(`PERFORMED_BEHAVIOR:${record.userId}`);
      }

      // Link to related memories
      if (this.embedder) {
        const relatedMemories = await this.findRelatedMemories(record.type, 3);
        for (const memId of relatedMemories) {
          await this.client.createRelationship({
            type: 'RELATED_TO',
            sourceId: nodeId,
            targetId: memId,
            properties: { relationType: 'behavior_context', createdAt: new Date().toISOString() },
          });
          relationships.push(`RELATED_TO:${memId}`);
        }
      }

      logger.debug(`[Mapper] Mapped behavior: ${nodeId}`);

      return {
        nodeId,
        relationships,
        success: true,
      };
    } catch (error) {
      logger.error('[Mapper] Failed to map behavior:', error);
      return {
        nodeId: record.id,
        relationships: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Map a knowledge record
   */
  async mapKnowledge(record: KnowledgeRecord): Promise<MappingResult> {
    try {
      const nodeId = record.id;
      const embedding = await this.generateEmbedding(`${record.title}\n${record.content}`);

      const knowledgeNode: Node = {
        id: nodeId,
        label: 'Knowledge',
        properties: {
          title: record.title,
          category: record.category,
          content: record.content,
          confidence: record.confidence ?? 0.8,
          source: record.source || 'extracted',
          tags: record.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      await this.client.createNode(knowledgeNode, true);

      const relationships: string[] = [];

      // Link to user
      if (record.userId) {
        await this.ensureUserExists(record.userId);
        await this.client.createRelationship({
          type: 'HAS_KNOWLEDGE',
          sourceId: record.userId,
          targetId: nodeId,
          properties: { source: 'learned', createdAt: new Date().toISOString() },
        });
        relationships.push(`HAS_KNOWLEDGE:${record.userId}`);
      }

      // Insert vector
      await this.client.insertVector({
        id: nodeId,
        embedding,
        nodeType: 'Knowledge',
        content: `${record.title}\n${record.content}`,
        metadata: {
          userId: record.userId,
          category: record.category,
          title: record.title,
        },
      });

      logger.debug(`[Mapper] Mapped knowledge: ${nodeId}`);

      return {
        nodeId,
        vectorId: nodeId,
        relationships,
        success: true,
      };
    } catch (error) {
      logger.error('[Mapper] Failed to map knowledge:', error);
      return {
        nodeId: record.id,
        relationships: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // Entity Mapping
  // ============================================================================

  /**
   * Map an entity record
   */
  async mapEntity(record: EntityRecord): Promise<MappingResult> {
    try {
      const nodeId = record.id;
      const embedding = await this.generateEmbedding(record.name);

      const entityNode: Node = {
        id: nodeId,
        label: 'Entity',
        properties: {
          name: record.name,
          type: record.type,
          aliases: record.aliases || [],
          properties: JSON.stringify(record.properties || {}),
          createdAt: new Date().toISOString(),
        },
      };

      await this.client.createNode(entityNode, true);

      // Insert vector for entity
      await this.client.insertVector({
        id: nodeId,
        embedding,
        nodeType: 'Entity',
        content: record.name,
        metadata: {
          name: record.name,
          type: record.type,
          aliases: record.aliases || [],
        },
      });

      logger.debug(`[Mapper] Mapped entity: ${nodeId}`);

      return {
        nodeId,
        vectorId: nodeId,
        relationships: [],
        success: true,
      };
    } catch (error) {
      logger.error('[Mapper] Failed to map entity:', error);
      return {
        nodeId: record.id,
        relationships: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async generateEmbedding(text: string): Promise<number[]> {
    return await this.embedder.embedQuery(text);
  }

  private async generateSummary(content: string): Promise<string> {
    if (content.length <= 100) {
      return content;
    }
    return content.substring(0, 100) + '...';
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.client.getNode(userId);
    if (!user) {
      await this.client.createNode({
        id: userId,
        label: 'User',
        properties: {
          name: userId,
          createdAt: new Date().toISOString(),
        },
      });
    }
  }

  private async findUserByEmailOrName(identifier: string): Promise<string | null> {
    const result = await this.client.query(
      `MATCH (u:User) WHERE u.email = $id OR u.name = $id RETURN u.id as userId`,
      { id: identifier }
    );

    if (result.records.length > 0) {
      return result.records[0].get('userId');
    }
    return null;
  }

  private async findPreviousDiary(userId: string, currentDate: string): Promise<string | null> {
    const result = await this.client.query(
      `MATCH (u:User {id: $userId})-[:WROTE_DIARY]->(d:Diary)
       WHERE d.date < $currentDate
       RETURN d.id as diaryId
       ORDER BY d.date DESC
       LIMIT 1`,
      { userId, currentDate }
    );

    if (result.records.length > 0) {
      return result.records[0].get('diaryId');
    }
    return null;
  }

  private async extractEntities(content: string): Promise<Array<{ id: string; name: string; type: string }>> {
    if (!this.llm) {
      return [];
    }

    try {
      const prompt = `Extract named entities from the following text. Return JSON array with {id, name, type} where type is one of: person, organization, location, concept.

Text: ${content}

Response format: [{"id": "entity-001", "name": "Entity Name", "type": "person"}]`;

      const response = await this.llm.generate(prompt, { jsonMode: true, temperature: 0.1 });
      const entities = JSON.parse(response);
      return Array.isArray(entities) ? entities : [];
    } catch (error) {
      logger.warn('[Mapper] Entity extraction failed:', error);
      return [];
    }
  }

  private async linkEntityToMemory(memoryId: string, entity: { id: string; name: string; type: string }): Promise<void> {
    // Ensure entity exists
    const existing = await this.client.getNode(entity.id);
    if (!existing) {
      await this.mapEntity({
        id: entity.id,
        name: entity.name,
        type: entity.type as any,
      });
    }

    // Create relationship
    await this.client.createRelationship({
      type: 'MENTIONS_ENTITY',
      sourceId: memoryId,
      targetId: entity.id,
      properties: {
        confidence: 0.8,
        mentionCount: 1,
        createdAt: new Date().toISOString(),
      },
    });
  }

  private async findRelatedMemories(query: string, limit: number): Promise<string[]> {
    try {
      const results = await this.client.vectorSearch(query, limit);
      return results.map(r => r.id);
    } catch {
      return [];
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMemoryGraphMapper(
  client: GraphClient,
  embedder: EmbeddingProvider,
  llm?: LLMProvider
): MemoryGraphMapper {
  return new MemoryGraphMapper(client, embedder, llm);
}

export default MemoryGraphMapper;
