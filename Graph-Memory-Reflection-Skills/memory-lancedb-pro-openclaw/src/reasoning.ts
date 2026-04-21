/**
 * Graph Reasoning Engine
 * 
 * Performs pattern detection, path analysis, and inference on the knowledge graph.
 */

import { GraphClient } from './graph-client';
import { LLMProvider } from '../types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface ReasoningResult {
  type: 'pattern' | 'inference' | 'path' | 'anomaly' | 'recommendation';
  confidence: number;
  description: string;
  evidence: Array<{
    nodeId: string;
    nodeType: string;
    relevance: number;
  }>;
  suggestedActions?: string[];
}

export interface PatternMatch {
  pattern: string;
  occurrences: number;
  nodes: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface AnomalyDetection {
  id: string;
  type: 'temporal' | 'behavioral' | 'content';
  severity: 'low' | 'medium' | 'high';
  description: string;
  deviation: number;
}

// ============================================================================
// GraphReasoningEngine Class
// ============================================================================

export class GraphReasoningEngine {
  private client: GraphClient;
  private llm?: LLMProvider;

  constructor(client: GraphClient, llm?: LLMProvider) {
    this.client = client;
    this.llm = llm;
  }

  /**
   * Find behavioral patterns in user's memory graph
   */
  async detectPatterns(userId: string, timeRangeDays = 30): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = [];

    const result = await this.client.query(`
      MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
      WHERE m.createdAt >= datetime() - duration({days: $days})
      WITH m.type as type, collect(m) as memories
      WHERE size(memories) >= 3
      RETURN type, size(memories) as count,
        memories[0].createdAt as firstSeen,
        memories[-1].createdAt as lastSeen,
        [m IN memories | m.id] as nodeIds
      ORDER BY count DESC
      LIMIT 10
    `, { userId, days: timeRangeDays });

    for (const r of result.records) {
      patterns.push({
        pattern: r.get('type'),
        occurrences: r.get('count').toNumber(),
        nodes: r.get('nodeIds'),
        firstSeen: r.get('firstSeen'),
        lastSeen: r.get('lastSeen'),
      });
    }

    return patterns;
  }

  /**
   * Detect temporal anomalies in user behavior
   */
  async detectTemporalAnomalies(userId: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    const result = await this.client.query(`
      MATCH (u:User {id: $userId})-[:PERFORMED_BEHAVIOR]->(b:Behavior)
      WITH b.type as type, collect(b) as behaviors
      WHERE size(behaviors) >= 5
      UNWIND behaviors as b
      WITH type, behaviors, b,
        avg([x IN behaviors | x.timestamp]) as meanTime,
        apoc.coll.stdev([x IN behaviors | x.timestamp]) as stdDev
      WHERE abs(duration.inSeconds(b.timestamp, meanTime).seconds) > stdDev * 2
      RETURN type, b.id as id, b.timestamp as timestamp,
        duration.inSeconds(b.timestamp, meanTime).seconds / stdDev as deviation
      ORDER BY deviation DESC
      LIMIT 10
    `, { userId });

    for (const r of result.records) {
      const deviation = Math.abs(r.get('deviation').toNumber());
      anomalies.push({
        id: r.get('id'),
        type: 'temporal',
        severity: deviation > 3 ? 'high' : deviation > 2 ? 'medium' : 'low',
        description: `Unusual timing for behavior type: ${r.get('type')}`,
        deviation,
      });
    }

    return anomalies;
  }

  /**
   * Infer relationships between entities through path analysis
   */
  async inferEntityRelationships(
    entityAId: string,
    entityBId: string
  ): Promise<ReasoningResult[]> {
    const results: ReasoningResult[] = [];

    const pathResult = await this.client.query(`
      MATCH path = (a:Entity {id: $entityAId})-[*1..4]-(b:Entity {id: $entityBId})
      RETURN path, length(path) as pathLength
      ORDER BY pathLength
      LIMIT 5
    `, { entityAId, entityBId });

    if (pathResult.records.length > 0) {
      const path = pathResult.records[0].get('path');
      const pathLength = pathResult.records[0].get('pathLength').toNumber();

      results.push({
        type: 'path',
        confidence: 1 - (pathLength * 0.15),
        description: `Entities connected through ${pathLength - 1} intermediate node(s)`,
        evidence: path.map((segment: any) => ({
          nodeId: segment.start?.properties?.id || '',
          nodeType: segment.start?.labels?.[0] || '',
          relevance: 1,
        })),
      });
    }

    return results;
  }

  /**
   * Generate insights based on memory analysis
   */
  async generateInsights(userId: string): Promise<ReasoningResult[]> {
    const insights: ReasoningResult[] = [];

    const coreMemories = await this.client.query(`
      MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
      WHERE m.tier = 'core'
      RETURN m
      ORDER BY m.accessCount DESC
      LIMIT 5
    `, { userId });

    if (coreMemories.records.length >= 3) {
      insights.push({
        type: 'pattern',
        confidence: 0.85,
        description: 'User has strong recurring interests based on frequently accessed core memories',
        evidence: coreMemories.records.map(r => ({
          nodeId: r.get('m').properties.id,
          nodeType: 'Memory',
          relevance: 0.9,
        })),
      });
    }

    const recentActivity = await this.client.query(`
      MATCH (u:User {id: $userId})-[:PERFORMED_BEHAVIOR]->(b:Behavior)
      WHERE b.timestamp >= datetime() - duration({days: 7})
      RETURN count(b) as recentCount
    `, { userId });

    const pastActivity = await this.client.query(`
      MATCH (u:User {id: $userId})-[:PERFORMED_BEHAVIOR]->(b:Behavior)
      WHERE b.timestamp >= datetime() - duration({days: 14}) 
        AND b.timestamp < datetime() - duration({days: 7})
      RETURN count(b) as pastCount
    `, { userId });

    const recent = recentActivity.records[0]?.get('recentCount')?.toNumber() || 0;
    const past = pastActivity.records[0]?.get('pastCount')?.toNumber() || 0;

    if (past > 0) {
      const change = (recent - past) / past;
      
      if (change > 0.5) {
        insights.push({
          type: 'inference',
          confidence: 0.8,
          description: `Significant increase in activity (${Math.round(change * 100)}%) over the past week`,
          evidence: [],
          suggestedActions: ['Check for new projects or interests', 'Consider updating priorities'],
        });
      } else if (change < -0.5) {
        insights.push({
          type: 'inference',
          confidence: 0.8,
          description: `Significant decrease in activity (${Math.round(change * 100)}%) over the past week`,
          evidence: [],
          suggestedActions: ['Check for potential burnout', 'Review workload balance'],
        });
      }
    }

    return insights;
  }

  /**
   * Recommend related memories based on current context
   */
  async recommendMemories(memoryId: string, limit = 5): Promise<ReasoningResult[]> {
    const recommendations: ReasoningResult[] = [];

    const related = await this.client.query(`
      MATCH (m:Memory {id: $memoryId})-[r:RELATED_TO]->(related:Memory)
      WHERE related.confidence >= 0.7
      RETURN related, r.similarity as similarity
      ORDER BY similarity DESC
      LIMIT $limit
    `, { memoryId, limit });

    if (related.records.length > 0) {
      recommendations.push({
        type: 'recommendation',
        confidence: 0.75,
        description: 'Memories related to your current context',
        evidence: related.records.map(r => ({
          nodeId: r.get('related').properties.id,
          nodeType: 'Memory',
          relevance: r.get('similarity') || 0.5,
        })),
      });
    }

    const entities = await this.client.query(`
      MATCH (m:Memory {id: $memoryId})-[r:MENTIONS_ENTITY]->(e:Entity)
      MATCH (e)<-[:MENTIONS_ENTITY]-(other:Memory)
      WHERE other.id <> $memoryId
      RETURN other, count(*) as mentions
      ORDER BY mentions DESC
      LIMIT $limit
    `, { memoryId, limit });

    if (entities.records.length > 0) {
      recommendations.push({
        type: 'pattern',
        confidence: 0.7,
        description: 'Memories sharing common entities',
        evidence: entities.records.map(r => ({
          nodeId: r.get('other').properties.id,
          nodeType: 'Memory',
          relevance: r.get('mentions').toNumber() / 10,
        })),
      });
    }

    return recommendations;
  }

  /**
   * Answer complex questions using graph traversal
   */
  async answerQuestion(question: string, userId: string): Promise<ReasoningResult | null> {
    if (!this.llm) {
      return null;
    }

    const questionLower = question.toLowerCase();

    if (questionLower.includes('why')) {
      return await this.answerWhyQuestion(question, userId);
    }

    if (questionLower.includes('how') || questionLower.includes('what')) {
      return await this.answerHowWhatQuestion(question, userId);
    }

    if (questionLower.includes('who')) {
      return await this.answerWhoQuestion(question, userId);
    }

    if (questionLower.includes('when')) {
      return await this.answerWhenQuestion(question, userId);
    }

    return null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async answerWhyQuestion(question: string, userId: string): Promise<ReasoningResult | null> {
    const recentMemories = await this.client.query(`
      MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
      RETURN m
      ORDER BY m.createdAt DESC
      LIMIT 10
    `, { userId });

    if (recentMemories.records.length === 0) {
      return null;
    }

    const prompt = `Based on the user's recent memories, infer possible reasons or context:

Question: ${question}

Recent memories:
${recentMemories.records.map(r => `- ${r.get('m').properties.content}`).join('\n')}

Provide a concise answer explaining possible reasons.`;

    try {
      const answer = await this.llm!.generate(prompt, { temperature: 0.5, maxTokens: 200 });

      return {
        type: 'inference',
        confidence: 0.7,
        description: answer,
        evidence: recentMemories.records.slice(0, 5).map(r => ({
          nodeId: r.get('m').properties.id,
          nodeType: 'Memory',
          relevance: 0.8,
        })),
      };
    } catch (error) {
      logger.warn('[Reasoning] LLM failed:', error);
      return null;
    }
  }

  private async answerHowWhatQuestion(question: string, userId: string): Promise<ReasoningResult | null> {
    const relevantMemories = await this.client.query(`
      MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
      WHERE m.content CONTAINS $keyword OR m.type = $type
      RETURN m
      ORDER BY m.confidence DESC
      LIMIT 5
    `, { userId, keyword: question.split(' ').slice(-3).join(' '), type: 'fact' });

    if (relevantMemories.records.length === 0) {
      return null;
    }

    const prompt = `Based on the user's stored knowledge, answer this question:

Question: ${question}

Relevant knowledge:
${relevantMemories.records.map(r => `- ${r.get('m').properties.content}`).join('\n')}

Provide a clear, concise answer.`;

    try {
      const answer = await this.llm!.generate(prompt, { temperature: 0.5, maxTokens: 200 });

      return {
        type: 'inference',
        confidence: 0.75,
        description: answer,
        evidence: relevantMemories.records.map(r => ({
          nodeId: r.get('m').properties.id,
          nodeType: 'Memory',
          relevance: r.get('m').properties.confidence || 0.5,
        })),
      };
    } catch (error) {
      logger.warn('[Reasoning] LLM failed:', error);
      return null;
    }
  }

  private async answerWhoQuestion(question: string, userId: string): Promise<ReasoningResult | null> {
    const personPattern = question.replace(/.*who\s+(is|was|are|were)\s+/i, '').trim();

    const entities = await this.client.query(`
      MATCH (u:User {id: $userId})-[:HAS_MEMORY|MENTIONS_ENTITY]->(e:Entity)
      WHERE e.name CONTAINS $name OR e.aliases CONTAINS $name
      RETURN e
      LIMIT 3
    `, { userId, name: personPattern });

    if (entities.records.length === 0) {
      return null;
    }

    return {
      type: 'inference',
      confidence: 0.8,
      description: `Found entity: ${entities.records[0].get('e').properties.name}`,
      evidence: entities.records.map(r => ({
        nodeId: r.get('e').properties.id,
        nodeType: 'Entity',
        relevance: 1,
      })),
    };
  }

  private async answerWhenQuestion(question: string, userId: string): Promise<ReasoningResult | null> {
    const result = await this.client.query(`
      MATCH (u:User {id: $userId})-[:WROTE_DIARY|ATTENDED_MEETING|PERFORMED_BEHAVIOR]->(n)
      RETURN n
      ORDER BY n.date DESC, n.startTime DESC, n.timestamp DESC
      LIMIT 10
    `, { userId });

    if (result.records.length === 0) {
      return null;
    }

    const latest = result.records[0].get('n').properties;

    return {
      type: 'inference',
      confidence: 0.9,
      description: `Most recent activity: ${latest.title || latest.type || 'Entry'} on ${latest.date || latest.startTime || latest.timestamp}`,
      evidence: [{
        nodeId: latest.id,
        nodeType: result.records[0].get('n').labels[0],
        relevance: 1,
      }],
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGraphReasoningEngine(
  client: GraphClient,
  llm?: LLMProvider
): GraphReasoningEngine {
  return new GraphReasoningEngine(client, llm);
}

export default GraphReasoningEngine;