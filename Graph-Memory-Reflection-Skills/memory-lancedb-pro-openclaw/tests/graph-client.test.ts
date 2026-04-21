/**
 * GraphClient SDK Tests
 */

import { describe, it, expect, before, after, beforeEach } from 'vitest';
import { GraphClient, createGraphClient } from '../src/graph-client';

describe('GraphClient', () => {
  let client: GraphClient;

  const testConfig = {
    neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4jUser: process.env.NEO4J_USER || 'neo4j',
    neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
    lanceDbPath: './test-lancedb',
  };

  before(() => {
    client = createGraphClient(testConfig);
  });

  after(async () => {
    if (client.isConnectedToGraph()) {
      await client.disconnect();
    }
  });

  describe('Connection', () => {
    it('should not be connected initially', () => {
      expect(client.isConnectedToGraph()).toBe(false);
    });

    it('should throw when query called without connection', async () => {
      await expect(client.query('MATCH (n) RETURN n')).rejects.toThrow();
    });
  });

  describe('Node Operations', () => {
    const testNode = {
      id: 'test-node-001',
      label: 'User',
      properties: {
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    it('should create a node', async () => {
      await client.createNode(testNode);
      const node = await client.getNode(testNode.id);
      expect(node).toBeDefined();
      expect(node?.id).toBe(testNode.id);
    });

    it('should merge a node if exists', async () => {
      await client.createNode(testNode, true);
      const node = await client.getNode(testNode.id);
      expect(node).toBeDefined();
    });

    it('should get a node by ID', async () => {
      const node = await client.getNode(testNode.id);
      expect(node).toBeDefined();
      expect(node?.label).toBe('User');
    });

    it('should return null for non-existent node', async () => {
      const node = await client.getNode('non-existent-id');
      expect(node).toBeNull();
    });

    it('should delete a node', async () => {
      await client.deleteNode(testNode.id);
      const node = await client.getNode(testNode.id);
      expect(node).toBeNull();
    });
  });

  describe('Relationship Operations', () => {
    const sourceNode = {
      id: 'source-001',
      label: 'User',
      properties: { name: 'Source User' },
    };

    const targetNode = {
      id: 'target-001',
      label: 'Memory',
      properties: { content: 'Test memory' },
    };

    it('should create nodes before relationship', async () => {
      await client.createNode(sourceNode);
      await client.createNode(targetNode);
    });

    it('should create a relationship', async () => {
      await client.createRelationship({
        type: 'HAS_MEMORY',
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        properties: { createdAt: new Date().toISOString() },
      });
    });

    it('should query related nodes', async () => {
      const result = await client.query(
        `MATCH (u:User {id: $sourceId})-[:HAS_MEMORY]->(m:Memory)
         RETURN m.id as memoryId`,
        { sourceId: sourceNode.id }
      );
      expect(result.records.length).toBeGreaterThan(0);
    });

    it('should delete relationship via node deletion', async () => {
      await client.deleteNode(sourceNode.id);
      await client.deleteNode(targetNode.id);
    });
  });

  describe('Vector Operations', () => {
    const testVector = {
      id: 'vector-001',
      embedding: new Array(768).fill(0).map(() => Math.random()),
      nodeType: 'Memory',
      content: 'Test vector content',
      metadata: { userId: 'test-user' },
    };

    it('should insert a vector record', async () => {
      await client.insertVector(testVector);
    });

    it('should search vectors', async () => {
      const results = await client.client.vectorSearch('test', 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should delete a vector record', async () => {
      await client.deleteVector(testVector.id);
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe to events', () => {
      const unsubscribe = client.subscribe('node_created', () => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should handle multiple subscribers', () => {
      const handler1 = () => {};
      const handler2 = () => {};

      const unsub1 = client.subscribe('node_created', handler1);
      const unsub2 = client.subscribe('node_created', handler2);

      unsub1();
      unsub2();
    });
  });
});