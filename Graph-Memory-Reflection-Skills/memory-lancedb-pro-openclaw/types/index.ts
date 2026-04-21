/**
 * Type definitions for Memory Graph Pro
 * 
 * Provides interface definitions for embedding, LLM, and reranking providers.
 */

// ============================================================================
// Embedding Provider
// ============================================================================

export interface EmbeddingProvider {
  /**
   * Embed a single query text
   */
  embedQuery(text: string): Promise<number[]>;

  /**
   * Embed multiple documents
   */
  embedDocuments(documents: string[]): Promise<number[][]>;

  /**
   * Get embedding dimensions
   */
  getDimensions?(): number;
}

export interface EmbeddingConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  dimensions?: number;
  taskQuery?: string;
  taskPassage?: string;
  normalized?: boolean;
}

// ============================================================================
// LLM Provider
// ============================================================================

export interface LLMProvider {
  /**
   * Generate text from a prompt
   */
  generate(
    prompt: string,
    options?: LLMGenerateOptions
  ): Promise<string>;

  /**
   * Generate with structured output
   */
  generateStructured?<T>(
    prompt: string,
    schema?: any
  ): Promise<T>;

  /**
   * Chat completion
   */
  chat?(messages: ChatMessage[]): Promise<string>;
}

export interface LLMGenerateOptions {
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// Rerank Provider
// ============================================================================

export interface RerankProvider {
  /**
   * Rerank documents based on query relevance
   */
  rerank(
    query: string,
    documents: Array<{ text: string; index: number }>,
    topN: number
  ): Promise<Array<{ index: number; score: number }>>;

  /**
   * Get reranker model name
   */
  getModel?(): string;
}

export interface RerankConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
  topN?: number;
}

// ============================================================================
// Memory Types
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

export interface MemoryTier {
  tier: 'core' | 'working' | 'peripheral';
  beta: number;      // Weibull decay parameter
  floor: number;     // Minimum strength threshold
}

// ============================================================================
// Retrieval Types
// ============================================================================

export interface RetrievalConfig {
  mode: 'vector' | 'bm25' | 'hybrid';
  vectorWeight?: number;
  bm25Weight?: number;
  rerank?: 'cross-encoder' | 'none';
  rerankProvider?: string;
  rerankModel?: string;
  rerankEndpoint?: string;
  rerankApiKey?: string;
  candidatePoolSize?: number;
  minScore?: number;
  hardMinScore?: number;
  filterNoise?: boolean;
}

export interface RetrievalResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Graph Types
// ============================================================================

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphRelationship {
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, any>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface GraphEvent {
  type: 'node_created' | 'node_updated' | 'node_deleted' | 
        'relationship_created' | 'relationship_deleted';
  timestamp: Date;
  data: {
    node?: GraphNode;
    relationship?: GraphRelationship;
    changes?: Record<string, { old: any; new: any }>;
  };
}

export type EventHandler = (event: GraphEvent) => void | Promise<void>;

// ============================================================================
// Configuration Types
// ============================================================================

export interface MemoryGraphProConfig {
  embedding: EmbeddingConfig;
  llm?: LLMConfig;
  rerank?: RerankConfig;
  retrieval?: RetrievalConfig;
  
  // Neo4j Configuration
  neo4jUri?: string;
  neo4jUser?: string;
  neo4jPassword?: string;
  neo4jDatabase?: string;
  
  // LanceDB Configuration
  lanceDbPath?: string;
  
  // Feature toggles
  autoCapture?: boolean;
  autoRecall?: boolean;
  smartExtraction?: boolean;
  extractMinMessages?: number;
  extractMaxChars?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type MaybePromise<T> = T | Promise<T>;

export interface AsyncResult<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

// Default export
export default {
  EmbeddingProvider,
  LLMProvider,
  RerankProvider,
};