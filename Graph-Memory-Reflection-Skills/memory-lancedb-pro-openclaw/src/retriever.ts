/**
 * Graph Retriever
 * 
 * Retrieves nodes from Neo4j graph and LanceDB vector storage.
 */

import { GraphClient, Node, VectorSearchResult } from './graph-client';
import { EmbeddingProvider } from '../types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface RetrievalQuery {
  text?: string;
  type?: string;
  userId?: string;
  scope?: string;
  tier?: 'core' | 'working' | 'peripheral';
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export interface RetrievalResult {
  id: string;
  label: string;
  type?: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface GraphPath {
  nodes: Array<{ id: string; label: string; properties: Record<string, any> }>;
  relationships: Array<{ type: string; source: string; target: string }>;
}

// ============================================================================
// GraphRetriever Class
// ============================================================================

export class GraphRetriever {
  private client: GraphClient;
  private embedder: EmbeddingProvider;

  constructor(client: GraphClient, embedder: EmbeddingProvider) {
    this.client = client;
    this.embedder = embedder;
  }

  /**
   * Search memories by text query
   */
  async searchMemories(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const { text, userId, scope, tier, dateRange, limit = 10 } = query;

    let results: RetrievalResult[] = [];

    // Vector search if text provided
    if (text) {
      try {
        const vectorResults = await this.client.vectorSearch(text, limit * 2);

        results = vectorResults
          .filter(r => r.nodeType === 'Memory')
          .map(r => ({
            id: r.id,
            label: 'Memory',
            type: r.metadata.type,
            content: r.content,
            score: r.score,
            metadata: r.metadata,
            createdAt: r.metadata.createdAt || new Date().toISOString(),
          }));
      } catch (error) {
        logger.warn('[Retriever] Vector search failed:', error);
      }
    }

    // If no vector search or need more results, use graph query
    if (results.length < limit || !text) {
      const graphResults = await this.queryMemoriesGraph({
        userId,
        scope,
        tier,
        dateRange,
        limit: limit - results.length,
      });

      for (const item of graphResults) {
        if (!results.some(r => r.id === item.id)) {
          results.push(item);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<RetrievalResult | null> {
    const node = await this.client.getNode(id);
    if (!node) return null;

    return {
      id: node.id,
      label: node.label,
      content: node.properties.content || node.properties.title || '',
      score: 1,
      metadata: node.properties,
      createdAt: node.properties.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Get user's diaries within date range
   */
  async getDiaries(userId: string, dateRange?: { start: string; end: string }, limit = 10): Promise<RetrievalResult[]> {
    let cypher = `
      MATCH (u:User {id: $userId})-[:WROTE_DIARY]->(d:Diary)
    `;

    const params: Record<string, any> = { userId };

    if (dateRange) {
      cypher += `
        WHERE d.date >= $startDate AND d.date <= $endDate
      `;
      params.startDate = dateRange.start;
      params.endDate = dateRange.end;
    }

    cypher += `
      RETURN d
      ORDER BY d.date DESC
      LIMIT $limit
    `;
    params.limit = limit;

    const result = await this.client.query(cypher, params);

    return result.records.map(r => {
      const d = r.get('d').properties;
      return {
        id: d.id,
        label: 'Diary',
        content: d.content || '',
        score: 1,
        metadata: d,
        createdAt: d.createdAt || new Date().toISOString(),
      };
    });
  }

  /**
   * Get user's meetings within date range
   */
  async getMeetings(userId: string, dateRange?: { start: string; end: string }, limit = 10): Promise<RetrievalResult[]> {
    let cypher = `
      MATCH (u:User {id: $userId})-[:ATTENDED_MEETING]->(m:Meeting)
    `;

    const params: Record<string, any> = { userId };

    if (dateRange) {
      cypher += `
        WHERE m.startTime >= $startDate AND m.startTime <= $endDate
      `;
      params.startDate = dateRange.start;
      params.endDate = dateRange.end;
    }

    cypher += `
      RETURN m
      ORDER BY m.startTime DESC
      LIMIT $limit
    `;
    params.limit = limit;

    const result = await this.client.query(cypher, params);

    return result.records.map(r => {
      const m = r.get('m').properties;
      return {
        id: m.id,
        label: 'Meeting',
        type: m.title,
        content: m.content || '',
        score: 1,
        metadata: m,
        createdAt: m.createdAt || new Date().toISOString(),
      };
    });
  }

  /**
   * Get user's behaviors within date range
   */
  async getBehaviors(userId: string, dateRange?: { start: string; end: string }, limit = 50): Promise<RetrievalResult[]> {
    let cypher = `
      MATCH (u:User {id: $userId})-[:PERFORMED_BEHAVIOR]->(b:Behavior)
    `;

    const params: Record<string, any> = { userId };

    if (dateRange) {
      cypher += `
        WHERE b.timestamp >= $startDate AND b.timestamp <= $endDate
      `;
      params.startDate = dateRange.start;
      params.endDate = dateRange.end;
    }

    cypher += `
      RETURN b
      ORDER BY b.timestamp DESC
      LIMIT $limit
    `;
    params.limit = limit;

    const result = await this.client.query(cypher, params);

    return result.records.map(r => {
      const b = r.get('b').properties;
      return {
        id: b.id,
        label: 'Behavior',
        type: b.type,
        content: b.details || '',
        score: 1,
        metadata: {
          type: b.type,
          timestamp: b.timestamp,
          duration: b.duration,
          details: b.details,
        },
        createdAt: b.createdAt || new Date().toISOString(),
      };
    });
  }

  /**
   * Get core memories for a user
   */
  async getCoreMemories(userId: string, limit = 20): Promise<RetrievalResult[]> {
    const result = await this.client.query(`
      MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
      WHERE m.tier = 'core'
      RETURN m
      ORDER BY m.accessedAt DESC
      LIMIT $limit
    `, { userId, limit });

    return result.records.map(r => {
      const m = r.get('m').properties;
      return {
        id: m.id,
        label: 'Memory',
        type: m.type,
        content: m.content || '',
        score: 1,
        metadata: m,
        createdAt: m.createdAt || new Date().toISOString(),
      };
    });
  }

  /**
   * Find related memories
   */
  async findRelatedMemories(memoryId: string, depth = 2, limit = 10): Promise<RetrievalResult[]> {
    const result = await this.client.query(`
      MATCH path = (m1:Memory {id: $memoryId})-[r:RELATED_TO*1..${depth}]->(m2:Memory)
      WHERE m2.confidence >= 0.7
      RETURN m2, length(path) as pathLength
      ORDER BY pathLength, m2.confidence DESC
      LIMIT $limit
    `, { memoryId, depth, limit });

    return result.records.map(r => {
      const m = r.get('m2').properties;
      return {
        id: m.id,
        label: 'Memory',
        type: m.type,
        content: m.content || '',
        score: m.confidence || 1,
        metadata: m,
        createdAt: m.createdAt || new Date().toISOString(),
      };
    });
  }

  /**
   * Find entities mentioned in memories
   */
  async findEntities(memoryId: string): Promise<RetrievalResult[]> {
    const result = await this.client.query(`
      MATCH (m:Memory {id: $memoryId})-[r:MENTIONS_ENTITY]->(e:Entity)
      RETURN e, r.confidence as confidence
      ORDER BY confidence DESC
    `, { memoryId });

    return result.records.map(r => {
      const e = r.get('e').properties;
      return {
        id: e.id,
        label: 'Entity',
        type: e.type,
        content: e.name,
        score: r.get('confidence'),
        metadata: e,
        createdAt: e.createdAt || new Date().toISOString(),
      };
    });
  }

  /**
   * Find path between two nodes
   */
  async findPath(sourceId: string, targetId: string, maxDepth = 3): Promise<GraphPath | null> {
    const result = await this.client.query(`
      MATCH path = (s {id: $sourceId})-[*1..${maxDepth}]-(t {id: $targetId})
      RETURN path
      LIMIT 1
    `, { sourceId, targetId, maxDepth });

    if (result.records.length === 0) {
      return null;
    }

    const path = result.records[0].get('path');
    const nodes: GraphPath['nodes'] = [];
    const relationships: GraphPath['relationships'] = [];

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (segment.start) {
        nodes.push({
          id: segment.start.properties.id,
          label: segment.start.labels[0],
          properties: segment.start.properties,
        });
      }
      if (segment.relationship) {
        relationships.push({
          type: segment.relationship.type,
          source: segment.relationship.start.properties.id,
          target: segment.relationship.end.properties.id,
        });
      }
    }

    return { nodes, relationships };
  }

  /**
   * Get knowledge graph statistics
   */
  async getStats(): Promise<{
    totalNodes: number;
    totalRelationships: number;
    byType: Record<string, number>;
  }> {
    const result = await this.client.query(`
      MATCH (n)
      RETURN count(n) as totalNodes
    `);

    const totalNodes = result.records[0]?.get('totalNodes')?.toNumber() || 0;

    const byTypeResult = await this.client.query(`
      MATCH (n)
      RETURN labels(n)[0] as type, count(*) as count
      ORDER BY count DESC
    `);

    const byType: Record<string, number> = {};
    byTypeResult.records.forEach(r => {
      byType[r.get('type')] = r.get('count').toNumber();
    });

    return {
      totalNodes,
      totalRelationships: 0,
      byType,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async queryMemoriesGraph(query: {
    userId?: string;
    scope?: string;
    tier?: string;
    dateRange?: { start: string; end: string };
    limit: number;
  }): Promise<RetrievalResult[]> {
    let cypher = '';
    const params: Record<string, any> = { limit: query.limit };

    if (query.userId) {
      cypher = `
        MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
      `;
      params.userId = query.userId;
    } else {
      cypher = 'MATCH (m:Memory)';
    }

    const conditions: string[] = [];

    if (query.tier) {
      conditions.push('m.tier = $tier');
      params.tier = query.tier;
    }

    if (query.scope) {
      conditions.push('m.scope = $scope');
      params.scope = query.scope;
    }

    if (query.dateRange) {
      conditions.push('m.createdAt >= $startDate AND m.createdAt <= $endDate');
      params.startDate = query.dateRange.start;
      params.endDate = query.dateRange.end;
    }

    if (conditions.length > 0) {
      cypher += ' WHERE ' + conditions.join(' AND ');
    }

    cypher += `
      RETURN m
      ORDER BY m.confidence DESC, m.accessedAt DESC
      LIMIT $limit
    `;

    const result = await this.client.query(cypher, params);

    return result.records.map(r => {
      const m = r.get('m').properties;
      return {
        id: m.id,
        label: 'Memory',
        type: m.type,
        content: m.content || '',
        score: m.confidence || 1,
        metadata: m,
        createdAt: m.createdAt || new Date().toISOString(),
      };
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGraphRetriever(
  client: GraphClient,
  embedder: EmbeddingProvider
): GraphRetriever {
  return new GraphRetriever(client, embedder);
}

export default GraphRetriever;