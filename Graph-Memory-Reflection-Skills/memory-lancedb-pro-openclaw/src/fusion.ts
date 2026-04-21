/**
 * Hybrid Fusion Retriever
 * 
 * Combines vector search and graph traversal for optimal retrieval.
 */

import { GraphClient } from './graph-client';
import { GraphRetriever, RetrievalResult, RetrievalQuery } from './retriever';
import { EmbeddingProvider, RerankProvider } from '../types';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface FusionConfig {
  vectorWeight: number;
  graphWeight: number;
  minScore: number;
  useRerank: boolean;
  useRRF: boolean;
  k: number;
}

export interface FusionResult extends RetrievalResult {
  vectorScore: number;
  graphScore: number;
  finalScore: number;
  sources: Array<'vector' | 'graph'>;
}

// ============================================================================
// HybridFusionRetriever Class
// ============================================================================

export class HybridFusionRetriever {
  private client: GraphClient;
  private retriever: GraphRetriever;
  private embedder: EmbeddingProvider;
  private reranker?: RerankProvider;
  private config: FusionConfig;

  private readonly DEFAULT_CONFIG: FusionConfig = {
    vectorWeight: 0.7,
    graphWeight: 0.3,
    minScore: 0.3,
    useRerank: true,
    useRRF: true,
    k: 60,
  };

  constructor(
    client: GraphClient,
    embedder: EmbeddingProvider,
    reranker?: RerankProvider,
    config?: Partial<FusionConfig>
  ) {
    this.client = client;
    this.retriever = new GraphRetriever(client, embedder);
    this.embedder = embedder;
    this.reranker = reranker;
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform hybrid search combining vector and graph results
   */
  async search(query: RetrievalQuery): Promise<FusionResult[]> {
    const limit = query.limit || 10;
    const vectorResults: FusionResult[] = [];
    const graphResults: FusionResult[] = [];

    // Vector search
    if (query.text) {
      try {
        const results = await this.client.vectorSearch(query.text, limit * 2);
        
        for (const r of results) {
          vectorResults.push({
            id: r.id,
            label: r.nodeType,
            type: r.metadata.type,
            content: r.content,
            score: 1 - r.score,
            vectorScore: 1 - r.score,
            graphScore: 0,
            finalScore: 0,
            sources: ['vector'],
            metadata: r.metadata,
            createdAt: r.metadata.createdAt || new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.warn('[Fusion] Vector search failed:', error);
      }
    }

    // Graph search
    try {
      const results = await this.retriever.searchMemories({
        userId: query.userId,
        scope: query.scope,
        tier: query.tier,
        dateRange: query.dateRange,
        limit: limit * 2,
      });

      for (const r of results) {
        const existing = vectorResults.find(v => v.id === r.id);
        if (existing) {
          existing.graphScore = r.score;
          existing.sources.push('graph');
        } else {
          graphResults.push({
            ...r,
            vectorScore: 0,
            graphScore: r.score,
            finalScore: 0,
            sources: ['graph'],
          });
        }
      }
    } catch (error) {
      logger.warn('[Fusion] Graph search failed:', error);
    }

    // Combine results
    let combined = [...vectorResults, ...graphResults];

    if (this.config.useRRF) {
      combined = this.applyRRF(combined);
    } else {
      combined = this.applyWeightedFusion(combined);
    }

    // Filter by minimum score
    combined = combined.filter(r => r.finalScore >= this.config.minScore);

    // Sort by final score
    combined.sort((a, b) => b.finalScore - a.finalScore);

    // Limit results
    combined = combined.slice(0, limit);

    // Rerank if enabled and reranker available
    if (this.config.useRerank && this.reranker && query.text) {
      combined = await this.rerankResults(query.text, combined);
    }

    return combined;
  }

  /**
   * Search with BM25 fallback for keyword matching
   */
  async searchWithKeywords(query: RetrievalQuery): Promise<FusionResult[]> {
    const results = await this.search(query);

    if (query.text && results.length < (query.limit || 10)) {
      const keywords = this.extractKeywords(query.text);
      
      if (keywords.length > 0) {
        const keywordResults = await this.searchByKeywords(keywords, query.userId);
        
        for (const kr of keywordResults) {
          if (!results.some(r => r.id === kr.id)) {
            results.push(kr);
          }
        }

        results.sort((a, b) => b.finalScore - a.finalScore);
        results.splice(query.limit || 10);
      }
    }

    return results;
  }

  /**
   * Get contextual results based on recent memories
   */
  async searchWithContext(
    query: RetrievalQuery,
    contextMemoryIds: string[]
  ): Promise<FusionResult[]> {
    const mainResults = await this.search(query);

    if (contextMemoryIds.length === 0) {
      return mainResults;
    }

    const contextResults: FusionResult[] = [];

    for (const memId of contextMemoryIds) {
      try {
        const related = await this.retriever.findRelatedMemories(memId, 2, 5);
        
        for (const r of related) {
          const existing = contextResults.find(c => c.id === r.id);
          if (!existing) {
            contextResults.push({
              ...r,
              vectorScore: 0.5,
              graphScore: r.score,
              finalScore: r.score * 0.8,
              sources: ['graph'],
            });
          }
        }
      } catch (error) {
        logger.warn(`[Fusion] Failed to get context for ${memId}:`, error);
      }
    }

    const combined = [...mainResults, ...contextResults];
    combined.sort((a, b) => b.finalScore - a.finalScore);

    return combined.slice(0, query.limit || 10);
  }

  /**
   * Get diversity-aware results using MMR
   */
  async searchWithDiversity(
    query: RetrievalQuery,
    lambda = 0.5
  ): Promise<FusionResult[]> {
    const results = await this.search({ ...query, limit: (query.limit || 10) * 3 });

    if (results.length <= (query.limit || 10)) {
      return results;
    }

    const selected: FusionResult[] = [];
    const remaining = [...results];

    while (selected.length < (query.limit || 10) && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = 0;

      for (let i = 0; i < remaining.length; i++) {
        const relevance = remaining[i].finalScore;
        
        let maxSimilarity = 0;
        for (const s of selected) {
          const sim = this.computeSimilarity(remaining[i].content, s.content);
          maxSimilarity = Math.max(maxSimilarity, sim);
        }

        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      selected.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    }

    return selected;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private applyRRF(results: FusionResult[]): FusionResult[] {
    const k = this.config.k;
    const rrfScores: Map<string, number> = new Map();

    for (const r of results) {
      if (r.vectorScore > 0) {
        const current = rrfScores.get(r.id) || 0;
        rrfScores.set(r.id, current + 1 / (k + r.vectorScore * 100));
      }

      if (r.graphScore > 0) {
        const current = rrfScores.get(r.id) || 0;
        rrfScores.set(r.id, current + 1 / (k + r.graphScore * 100));
      }
    }

    for (const r of results) {
      r.finalScore = rrfScores.get(r.id) || 0;
    }

    return results;
  }

  private applyWeightedFusion(results: FusionResult[]): FusionResult[] {
    for (const r of results) {
      r.finalScore = 
        (r.vectorScore * this.config.vectorWeight) +
        (r.graphScore * this.config.graphWeight);
    }

    return results;
  }

  private async rerankResults(
    query: string,
    results: FusionResult[]
  ): Promise<FusionResult[]> {
    if (!this.reranker || results.length === 0) {
      return results;
    }

    try {
      const reranked = await this.reranker.rerank(
        query,
        results.map((r, i) => ({ text: r.content, index: i })),
        results.length
      );

      const rerankedMap = new Map(reranked.map(r => [r.index, r.score]));

      for (const r of results) {
        const newScore = rerankedMap.get(results.indexOf(r));
        if (newScore !== undefined) {
          r.finalScore = newScore;
        }
      }

      results.sort((a, b) => b.finalScore - a.finalScore);

      return results;
    } catch (error) {
      logger.warn('[Fusion] Reranking failed:', error);
      return results;
    }
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
      'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
      'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    const wordFreq: Map<string, number> = new Map();
    for (const w of words) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w);
  }

  private async searchByKeywords(keywords: string[], userId?: string): Promise<FusionResult[]> {
    const results: FusionResult[] = [];

    for (const kw of keywords) {
      try {
        const cypher = userId
          ? `
            MATCH (u:User {id: $userId})-[:HAS_MEMORY]->(m:Memory)
            WHERE m.content CONTAINS $keyword
            RETURN m, m.confidence as score
            LIMIT 5
          `
          : `
            MATCH (m:Memory)
            WHERE m.content CONTAINS $keyword
            RETURN m, m.confidence as score
            LIMIT 5
          `;

        const result = await this.client.query(cypher, { userId, keyword: kw });

        for (const r of result.records) {
          const m = r.get('m').properties;
          if (!results.some(res => res.id === m.id)) {
            results.push({
              id: m.id,
              label: 'Memory',
              type: m.type,
              content: m.content || '',
              score: r.get('score') || 0.75,
              vectorScore: 0,
              graphScore: r.get('score') || 0.75,
              finalScore: (r.get('score') || 0.75) * 0.3,
              sources: ['graph'],
              metadata: m,
              createdAt: m.createdAt || new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        logger.warn(`[Fusion] Keyword search failed for "${kw}":`, error);
      }
    }

    return results;
  }

  private computeSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Update fusion configuration
   */
  updateConfig(config: Partial<FusionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): FusionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHybridFusionRetriever(
  client: GraphClient,
  embedder: EmbeddingProvider,
  reranker?: RerankProvider,
  config?: Partial<FusionConfig>
): HybridFusionRetriever {
  return new HybridFusionRetriever(client, embedder, reranker, config);
}

export default HybridFusionRetriever;