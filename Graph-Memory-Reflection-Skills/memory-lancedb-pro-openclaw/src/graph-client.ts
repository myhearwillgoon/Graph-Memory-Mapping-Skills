/**
 * GraphClient SDK for Memory Graph Pro
 * 
 * Provides unified interface for Neo4j graph operations and LanceDB vector storage.
 */

import neo4j, { Driver, Session, Transaction, Record as Neo4jRecord } from 'neo4j-driver';
import * as lancedb from 'lancedb';
import { EmbeddingProvider } from '../types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface GraphClientConfig {
  // Neo4j Configuration
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  neo4jDatabase?: string;

  // LanceDB Configuration
  lanceDbPath: string;

  // Optional Providers
  embeddingProvider?: EmbeddingProvider;

  // Connection Options
  connectionTimeout?: number;
  maxConnectionPoolSize?: number;
}

export interface Node {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface Relationship {
  id?: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, any>;
}

export interface VectorRecord {
  id: string;
  embedding: number[];
  nodeType: string;
  content: string;
  metadata: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  nodeType: string;
  content: string;
  metadata: Record<string, any>;
}

export interface GraphQueryResult {
  records: Neo4jRecord[];
  summary: any;
}

export type EventHandler = (event: GraphEvent) => void | Promise<void>;

export interface GraphEvent {
  type: 'node_created' | 'node_updated' | 'node_deleted' | 'relationship_created' | 'relationship_deleted';
  timestamp: Date;
  data: {
    node?: Node;
    relationship?: Relationship;
    changes?: Record<string, { old: any; new: any }>;
  };
}

// ============================================================================
// GraphClient Class
// ============================================================================

export class GraphClient {
  private driver: Driver | null = null;
  private db: any = null; // LanceDB connection
  private config: GraphClientConfig;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private isConnected = false;

  constructor(config: GraphClientConfig) {
    this.config = {
      connectionTimeout: 30000,
      maxConnectionPoolSize: 10,
      ...config,
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Initialize connections to both Neo4j and LanceDB
   */
  async connect(): Promise<void> {
    try {
      // Connect to Neo4j
      this.driver = neo4j.driver(
        this.config.neo4jUri,
        neo4j.auth.basic(this.config.neo4jUser, this.config.neo4jPassword),
        {
          connectionTimeout: this.config.connectionTimeout,
          maxConnectionPoolSize: this.config.maxConnectionPoolSize,
        }
      );

      // Verify Neo4j connection
      await this.driver.verifyConnectivity();
      logger.info('[GraphClient] Neo4j connected successfully');

      // Connect to LanceDB
      this.db = await lancedb.connect(this.config.lanceDbPath);
      logger.info('[GraphClient] LanceDB connected successfully');

      this.isConnected = true;

      // Initialize schema if needed
      await this.initializeSchema();
    } catch (error) {
      logger.error('[GraphClient] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
    this.isConnected = false;
    logger.info('[GraphClient] Disconnected');
  }

  /**
   * Check if client is connected
   */
  isConnectedToGraph(): boolean {
    return this.isConnected;
  }

  // ============================================================================
  // Schema Initialization
  // ============================================================================

  /**
   * Initialize graph schema (constraints and indexes)
   */
  private async initializeSchema(): Promise<void> {
    const session = this.getSession();
    try {
      // Node constraints
      await session.run(`
        CREATE CONSTRAINT user_id IF NOT EXISTS
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT memory_id IF NOT EXISTS
        FOR (m:Memory) REQUIRE m.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT diary_id IF NOT EXISTS
        FOR (d:Diary) REQUIRE d.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT meeting_id IF NOT EXISTS
        FOR (m:Meeting) REQUIRE m.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT behavior_id IF NOT EXISTS
        FOR (b:Behavior) REQUIRE b.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT knowledge_id IF NOT EXISTS
        FOR (k:Knowledge) REQUIRE k.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT entity_id IF NOT EXISTS
        FOR (e:Entity) REQUIRE e.id IS UNIQUE
      `);

      // Indexes
      await session.run(`
        CREATE INDEX memory_type IF NOT EXISTS
        FOR (m:Memory) ON (m.type)
      `);

      await session.run(`
        CREATE INDEX memory_scope IF NOT EXISTS
        FOR (m:Memory) ON (m.scope)
      `);

      await session.run(`
        CREATE INDEX memory_tier IF NOT EXISTS
        FOR (m:Memory) ON (m.tier)
      `);

      logger.info('[GraphClient] Schema initialized');
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // Core Graph Operations
  // ============================================================================

  /**
   * Execute a Cypher read query
   */
  async query(cypher: string, params?: Record<string, any>): Promise<GraphQueryResult> {
    this.ensureConnected();
    const session = this.getSession();

    try {
      const result = await session.run(cypher, params);
      return {
        records: result.records,
        summary: result.summary,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a Cypher write query within a transaction
   */
  async write(cypher: string, params?: Record<string, any>): Promise<GraphQueryResult> {
    this.ensureConnected();
    const session = this.getSession();

    try {
      const result = await session.executeWrite(async (tx: Transaction) => {
        return await tx.run(cypher, params);
      });

      // Emit event for monitoring
      this.emitEvent({
        type: 'node_created',
        timestamp: new Date(),
        data: { changes: { cypher: { old: null, new: cypher } } },
      });

      return {
        records: result.records,
        summary: result.summary,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Create or merge a node
   */
  async createNode(node: Node, merge = false): Promise<void> {
    this.ensureConnected();
    const session = this.getSession();

    const propertyKeys = Object.keys(node.properties);
    const setClauses = propertyKeys.map(key => `n.${key} = $${key}`).join(', ');

    const cypher = merge
      ? `MERGE (n:${node.label} {id: $id}) ON CREATE SET ${setClauses}, n.createdAt = datetime() ON MATCH SET ${setClauses}, n.updatedAt = datetime()`
      : `CREATE (n:${node.label} {id: $id, ${propertyKeys.map(k => `${k}: $${k}`).join(', ')}, createdAt: datetime()})`;

    const params = { id: node.id, ...node.properties };

    try {
      await session.run(cypher, params);
      logger.debug(`[GraphClient] ${merge ? 'Merged' : 'Created'} ${node.label} node: ${node.id}`);

      this.emitEvent({
        type: merge ? 'node_updated' : 'node_created',
        timestamp: new Date(),
        data: { node },
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Create a relationship between two nodes
   */
  async createRelationship(rel: Relationship): Promise<void> {
    this.ensureConnected();
    const session = this.getSession();

    const propertyKeys = Object.keys(rel.properties || {});
    const propClause = propertyKeys.length > 0
      ? `{${propertyKeys.map(k => `${k}: $${k}`).join(', ')}}`
      : '';

    const cypher = `
      MATCH (a {id: $sourceId}), (b {id: $targetId})
      CREATE (a)-[r:${rel.type} ${propClause}]->(b)
      RETURN r
    `;

    const params = { sourceId: rel.sourceId, targetId: rel.targetId, ...(rel.properties || {}) };

    try {
      await session.run(cypher, params);
      logger.debug(`[GraphClient] Created ${rel.type} relationship`);

      this.emitEvent({
        type: 'relationship_created',
        timestamp: new Date(),
        data: { relationship: rel },
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<Node | null> {
    this.ensureConnected();
    const session = this.getSession();

    try {
      const result = await session.run(
        'MATCH (n {id: $id}) RETURN n',
        { id }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0].get('n');
      return {
        id: record.properties.id,
        label: record.labels[0],
        properties: record.properties,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a node and all its relationships
   */
  async deleteNode(id: string): Promise<void> {
    this.ensureConnected();
    const session = this.getSession();

    try {
      await session.run(
        'MATCH (n {id: $id}) DETACH DELETE n',
        { id }
      );
      logger.debug(`[GraphClient] Deleted node: ${id}`);

      this.emitEvent({
        type: 'node_deleted',
        timestamp: new Date(),
        data: { node: { id, label: '', properties: {} } },
      });
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // Vector Operations (LanceDB)
  // ============================================================================

  /**
   * Insert a vector record into LanceDB
   */
  async insertVector(record: VectorRecord): Promise<void> {
    this.ensureConnected();

    try {
      const table = await this.getOrCreateVectorTable();
      await table.add([{
        ...record,
        embedding: new Float32Array(record.embedding),
      }]);
      logger.debug(`[GraphClient] Inserted vector: ${record.id}`);
    } catch (error) {
      logger.error('[GraphClient] Failed to insert vector:', error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async vectorSearch(
    query: string,
    topK = 10,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    this.ensureConnected();

    try {
      // Generate embedding if provider available
      let queryEmbedding: number[];
      if (this.config.embeddingProvider) {
        queryEmbedding = await this.config.embeddingProvider.embedQuery(query);
      } else {
        throw new Error('No embedding provider configured');
      }

      const table = await this.db.openTable('memories');

      let query_builder = table.search(queryEmbedding);
      
      if (filters) {
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          query_builder = query_builder.where(`${key} = '${value}'`);
        });
      }

      const results = await query_builder.limit(topK).execute();

      return results.map((r: any) => ({
        id: r.id,
        score: r._distance ? 1 - r._distance : r.score,
        nodeType: r.nodeType,
        content: r.content,
        metadata: r.metadata || {},
      }));
    } catch (error) {
      logger.error('[GraphClient] Vector search failed:', error);
      throw error;
    }
  }

  /**
   * Delete a vector record
   */
  async deleteVector(id: string): Promise<void> {
    this.ensureConnected();

    try {
      const table = await this.db.openTable('memories');
      await table.delete(`id = '${id}'`);
      logger.debug(`[GraphClient] Deleted vector: ${id}`);
    } catch (error) {
      logger.error('[GraphClient] Failed to delete vector:', error);
      throw error;
    }
  }

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  /**
   * Subscribe to graph events
   */
  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  private emitEvent(event: GraphEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          logger.error('[GraphClient] Event handler error:', error);
        }
      });
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getSession(): Session {
    if (!this.driver) {
      throw new Error('GraphClient not connected');
    }
    return this.driver.session({
      database: this.config.neo4jDatabase,
    });
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('GraphClient not connected. Call connect() first.');
    }
  }

  private async getOrCreateVectorTable(): Promise<any> {
    try {
      return await this.db.openTable('memories');
    } catch {
      // Table doesn't exist, create it
      return await this.db.createTable('memories', [
        { id: 'test', embedding: new Float32Array(768), nodeType: 'test', content: 'test', metadata: {} }
      ]);
    }
  }

  /**
   * Execute a batch of operations within a transaction
   */
  async transaction<T>(operations: (client: GraphClient) => Promise<T>): Promise<T> {
    this.ensureConnected();
    const session = this.getSession();

    try {
      return await session.executeWrite(async () => {
        return await operations(this);
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get graph statistics
   */
  async getStats(): Promise<{
    nodes: Record<string, number>;
    relationships: Record<string, number>;
  }> {
    this.ensureConnected();
    const session = this.getSession();

    try {
      const nodeResult = await session.run(`
        CALL apoc.meta.stats() YIELD labels
        RETURN labels
      `);

      const relResult = await session.run(`
        CALL apoc.meta.stats() YIELD relTypes
        RETURN relTypes
      `);

      return {
        nodes: nodeResult.records[0]?.get('labels') || {},
        relationships: relResult.records[0]?.get('relTypes') || {},
      };
    } catch {
      // Fallback without APOC
      const labelsResult = await session.run(`
        CALL db.labels() YIELD label
        RETURN label, count(*) as count
      `);

      const relTypesResult = await session.run(`
        CALL db.relationshipTypes() YIELD relationshipType
        RETURN relationshipType, count(*) as count
      `);

      const nodes: Record<string, number> = {};
      labelsResult.records.forEach(r => {
        nodes[r.get('label')] = r.get('count').toNumber();
      });

      const relationships: Record<string, number> = {};
      relTypesResult.records.forEach(r => {
        relationships[r.get('relationshipType')] = r.get('count').toNumber();
      });

      return { nodes, relationships };
    } finally {
      await session.close();
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGraphClient(config: GraphClientConfig): GraphClient {
  return new GraphClient(config);
}

// Default export
export default GraphClient;
