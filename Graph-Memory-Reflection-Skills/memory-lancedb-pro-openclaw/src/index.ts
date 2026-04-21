export { GraphClient, createGraphClient } from './graph-client';
export type {
  GraphClientConfig,
  Node,
  Relationship,
  VectorRecord,
  VectorSearchResult,
  GraphQueryResult,
  EventHandler,
  GraphEvent,
} from './graph-client';

export { MemoryGraphMapper, createMemoryGraphMapper } from './mapper';
export type {
  MemoryRecord,
  DiaryRecord,
  MeetingRecord,
  BehaviorRecord,
  KnowledgeRecord,
  EntityRecord,
  MappingResult,
} from './mapper';

export { GraphRetriever, createGraphRetriever } from './retriever';
export type {
  RetrievalQuery,
  RetrievalResult,
  GraphPath,
} from './retriever';

export { HybridFusionRetriever, createHybridFusionRetriever } from './fusion';
export type {
  FusionConfig,
  FusionResult,
} from './fusion';

export { GraphReasoningEngine, createGraphReasoningEngine } from './reasoning';
export type {
  ReasoningResult,
  PatternMatch,
  AnomalyDetection,
} from './reasoning';

export {
  GraphEventBus,
  LifecycleEventManager,
  AlertEventHandler,
  createGraphEventBus,
  createLifecycleEventManager,
  createAlertEventHandler,
} from './events';
export type {
  EventSubscription,
  EventFilter,
  EventPayload,
  AlertConfig,
} from './events';

export * from '../types';

export { GraphClient as default };
