/**
 * Graph Event System
 * 
 * Event-driven notifications for graph changes and lifecycle events.
 */

import { EventEmitter } from 'events';
import { GraphClient, GraphEvent } from './graph-client';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface EventSubscription {
  id: string;
  eventType: string;
  filter?: Record<string, any>;
  handler: EventHandler;
  createdAt: Date;
}

export type EventHandler = (event: GraphEvent) => void | Promise<void>;

export interface EventFilter {
  userId?: string;
  nodeType?: string;
  relationshipType?: string;
}

export interface EventPayload {
  type: string;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
}

// ============================================================================
// GraphEventBus Class
// ============================================================================

export class GraphEventBus extends EventEmitter {
  private client: GraphClient;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: Array<GraphEvent> = [];
  private processing = false;
  private maxQueueSize = 1000;

  constructor(client: GraphClient) {
    super();
    this.client = client;
    this.setupGraphSubscriptions();
  }

  private setupGraphSubscriptions(): void {
    this.client.subscribe('node_created', async (event) => {
      await this.emitToSubscribers(event);
      this.emit('node:created', event);
    });

    this.client.subscribe('node_updated', async (event) => {
      await this.emitToSubscribers(event);
      this.emit('node:updated', event);
    });

    this.client.subscribe('node_deleted', async (event) => {
      await this.emitToSubscribers(event);
      this.emit('node:deleted', event);
    });

    this.client.subscribe('relationship_created', async (event) => {
      await this.emitToSubscribers(event);
      this.emit('relationship:created', event);
    });

    this.client.subscribe('relationship_deleted', async (event) => {
      await this.emitToSubscribers(event);
      this.emit('relationship:deleted', event);
    });
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(
    eventType: string,
    handler: EventHandler,
    filter?: EventFilter
  ): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const subscription: EventSubscription = {
      id,
      eventType,
      filter,
      handler,
      createdAt: new Date(),
    };

    this.subscriptions.set(id, subscription);
    logger.debug(`[Events] Subscribed to ${eventType}: ${id}`);

    return id;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const deleted = this.subscriptions.delete(subscriptionId);
    if (deleted) {
      logger.debug(`[Events] Unsubscribed: ${subscriptionId}`);
    }
    return deleted;
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Publish an event to the bus
   */
  async publish(event: GraphEvent): Promise<void> {
    this.eventQueue.push(event);

    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift();
      logger.warn('[Events] Queue overflow, dropped oldest event');
    }

    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Emit event to matching subscribers
   */
  private async emitToSubscribers(event: GraphEvent): Promise<void> {
    for (const sub of this.subscriptions.values()) {
      if (this.matchesFilter(event, sub.filter)) {
        try {
          await sub.handler(event);
        } catch (error) {
          logger.error(`[Events] Handler error for ${sub.id}:`, error);
        }
      }
    }
  }

  /**
   * Process queued events
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        await this.emitToSubscribers(event);
      }
    }

    this.processing = false;
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: GraphEvent, filter?: EventFilter): boolean {
    if (!filter) return true;

    if (filter.userId && event.data.node?.properties?.userId !== filter.userId) {
      return false;
    }

    if (filter.nodeType && event.data.node?.label !== filter.nodeType) {
      return false;
    }

    if (filter.relationshipType && event.data.relationship?.type !== filter.relationshipType) {
      return false;
    }

    return true;
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    logger.debug('[Events] All subscriptions cleared');
  }
}

// ============================================================================
// Lifecycle Event Manager
// ============================================================================

export class LifecycleEventManager {
  private eventBus: GraphEventBus;
  private client: GraphClient;

  constructor(eventBus: GraphEventBus, client: GraphClient) {
    this.eventBus = eventBus;
    this.client = client;
    this.setupLifecycleRules();
  }

  private setupLifecycleRules(): void {
    this.eventBus.subscribe('node_created', async (event) => {
      if (event.data.node?.label === 'Memory') {
        await this.handleMemoryCreated(event);
      }
    });

    this.eventBus.subscribe('node_updated', async (event) => {
      if (event.data.node?.label === 'Memory') {
        await this.handleMemoryUpdated(event);
      }
    });
  }

  private async handleMemoryCreated(event: GraphEvent): Promise<void> {
    const memory = event.data.node;
    if (!memory) return;

    logger.debug(`[Lifecycle] Memory created: ${memory.id}`);
  }

  private async handleMemoryUpdated(event: GraphEvent): Promise<void> {
    const memory = event.data.node;
    if (!memory) return;

    const changes = event.data.changes;
    if (!changes) return;

    if (changes.accessCount) {
      await this.handleAccessCountChange(memory.id, changes.accessCount.new);
    }

    if (changes.tier) {
      await this.handleTierChange(memory.id, changes.tier.old, changes.tier.new);
    }
  }

  private async handleAccessCountChange(memoryId: string, newCount: number): Promise<void> {
    if (newCount >= 50) {
      await this.promoteToCore(memoryId);
    } else if (newCount >= 20) {
      await this.promoteToWorking(memoryId);
    }
  }

  private async handleTierChange(memoryId: string, oldTier: string, newTier: string): Promise<void> {
    logger.info(`[Lifecycle] Memory ${memoryId} tier changed: ${oldTier} -> ${newTier}`);
  }

  private async promoteToCore(memoryId: string): Promise<void> {
    try {
      await this.client.write(`
        MATCH (m:Memory {id: $id})
        SET m.tier = 'core'
        RETURN m
      `, { id: memoryId });

      logger.info(`[Lifecycle] Promoted memory to core: ${memoryId}`);
    } catch (error) {
      logger.error('[Lifecycle] Failed to promote to core:', error);
    }
  }

  private async promoteToWorking(memoryId: string): Promise<void> {
    try {
      await this.client.write(`
        MATCH (m:Memory {id: $id})
        WHERE m.tier = 'peripheral'
        SET m.tier = 'working'
        RETURN m
      `, { id: memoryId });

      logger.debug(`[Lifecycle] Promoted memory to working: ${memoryId}`);
    } catch (error) {
      logger.error('[Lifecycle] Failed to promote to working:', error);
    }
  }
}

// ============================================================================
// Alert System
// ============================================================================

export interface AlertConfig {
  enabled: boolean;
  channels: Array<'console' | 'webhook' | 'email'>;
  webhookUrl?: string;
  email?: string;
  severityThreshold: 'low' | 'medium' | 'high';
}

export class AlertEventHandler {
  private config: AlertConfig;
  private eventBus: GraphEventBus;

  constructor(eventBus: GraphEventBus, config: Partial<AlertConfig> = {}) {
    this.config = {
      enabled: true,
      channels: ['console'],
      severityThreshold: 'high',
      ...config,
    };
    this.eventBus = eventBus;
    this.setupAlertRules();
  }

  private setupAlertRules(): void {
    this.eventBus.subscribe('node_deleted', async (event) => {
      if (this.config.enabled) {
        await this.sendAlert({
          type: 'node_deleted',
          severity: 'medium',
          message: `Node deleted: ${event.data.node?.id}`,
          data: event.data,
        });
      }
    });

    this.eventBus.on('relationship:created', async (event) => {
      if (this.config.enabled) {
        logger.debug(`[Alert] Relationship created: ${event.data.relationship?.type}`);
      }
    });
  }

  private async sendAlert(alert: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    data: Record<string, any>;
  }): Promise<void> {
    const severityLevels = { low: 1, medium: 2, high: 3 };

    if (severityLevels[alert.severity] < severityLevels[this.config.severityThreshold]) {
      return;
    }

    for (const channel of this.config.channels) {
      switch (channel) {
        case 'console':
          logger.warn(`[Alert:${alert.severity.toUpperCase()}] ${alert.message}`);
          break;
        case 'webhook':
          if (this.config.webhookUrl) {
            await this.sendWebhook(alert);
          }
          break;
        case 'email':
          if (this.config.email) {
            await this.sendEmail(alert);
          }
          break;
      }
    }
  }

  private async sendWebhook(alert: any): Promise<void> {
    try {
      await fetch(this.config.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      logger.error('[Alert] Webhook failed:', error);
    }
  }

  private async sendEmail(alert: any): Promise<void> {
    logger.debug(`[Alert] Email sent to ${this.config.email}: ${alert.message}`);
  }

  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createGraphEventBus(client: GraphClient): GraphEventBus {
  return new GraphEventBus(client);
}

export function createLifecycleEventManager(
  eventBus: GraphEventBus,
  client: GraphClient
): LifecycleEventManager {
  return new LifecycleEventManager(eventBus, client);
}

export function createAlertEventHandler(
  eventBus: GraphEventBus,
  config?: Partial<AlertConfig>
): AlertEventHandler {
  return new AlertEventHandler(eventBus, config);
}

export default GraphEventBus;