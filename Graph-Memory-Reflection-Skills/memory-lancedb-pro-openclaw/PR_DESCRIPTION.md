# Silra.cn API Provider for memory-graph-a2a

This PR adds support for Silra.cn API provider, enabling users in China mainland to use memory-graph-a2a with local embedding and LLM services.

## 🎯 Motivation

Users in China face significant latency and connectivity issues when accessing US-based API providers (OpenAI, Jina, etc.). Silra.cn provides:

- **Low Latency**: Local API endpoints within China
- **High Availability**: Reliable connectivity for Chinese users
- **OpenAI-Compatible**: Drop-in replacement for existing providers
- **Cost-Effective**: Competitive pricing for embedding and LLM models

## 📦 What's Included

This PR implements:

1. **Silra Provider** (`src/providers/silra.ts`) - OpenAI-compatible embedding and LLM client
2. **Configuration Schema** - Updated plugin config to support Silra.cn
3. **Documentation** - Setup guide and configuration examples
4. **Environment Variables** - `SILRA_API_KEY` and `SILRA_BASE_URL` support

## 🚀 Quick Start

### Prerequisites

- Silra.cn API Key: Get from https://silra.cn/console/api-key
- memory-graph-a2a v1.1.0+ installed

### Configuration

Add to your `openclaw.json`:

```json
{
  "plugins": {
    "slots": { "memory": "memory-graph-a2a" },
    "entries": {
      "memory-graph-a2a": {
        "enabled": true,
        "config": {
          "embedding": {
            "provider": "silra",
            "apiKey": "${SILRA_API_KEY}",
            "model": "text-embedding-v4",
            "baseUrl": "https://api.silra.cn/v1"
          },
          "llm": {
            "provider": "silra",
            "apiKey": "${SILRA_API_KEY}",
            "model": "qwen3-8b",
            "baseUrl": "https://api.silra.cn/v1"
          },
          "rerank": {
            "provider": "silra",
            "apiKey": "${SILRA_API_KEY}",
            "model": "bge-reranker-v2-m3",
            "baseUrl": "https://api.silra.cn/v1"
          },
          "autoCapture": true,
          "autoRecall": true,
          "smartExtraction": true
        }
      }
    }
  }
}
```

### Environment Variables

```bash
export SILRA_API_KEY="sk-xxxxxxxxxxxxxxxx"
export SILRA_BASE_URL="https://api.silra.cn/v1"
```

## 📊 Supported Models

| Service | Model | Dimensions | Description |
|---------|-------|------------|-------------|
| Embedding | `text-embedding-v4` | 1024 | General purpose embedding |
| Embedding | `bge-large-zh-v1.5` | 1024 | Chinese-optimized embedding |
| LLM | `qwen3-8b` | - | Qwen3 8B for Smart Extraction |
| LLM | `qwen3.5-plus` | - | Enhanced reasoning |
| Reranker | `bge-reranker-v2-m3` | - | Cross-encoder reranking |

## 🧪 Testing

```bash
# Test embedding
curl https://api.silra.cn/v1/embeddings \
  -H "Authorization: Bearer $SILRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-v4","input":["test"]}'

# Test LLM
curl https://api.silra.cn/v1/chat/completions \
  -H "Authorization: Bearer $SILRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3-8b","messages":[{"role":"user","content":"Hello"}]}'
```

## 📝 Changes

### New Files

- `src/providers/silra.ts` - Silra.cn API client implementation
- `docs/providers/silra.md` - Provider documentation

### Modified Files

- `src/providers/index.ts` - Added Silra to provider registry
- `openclaw.plugin.json` - Updated config schema
- `README.md` - Added China region section
- `CHANGELOG.md` - Documented changes

## 🔧 Implementation Details

### Provider Architecture

The Silra provider follows the same interface as existing providers:

```typescript
interface EmbeddingProvider {
  embedQuery(query: string, task?: string): Promise<number[]>;
  embedDocuments(documents: string[]): Promise<number[][]>;
}

interface LLMProvider {
  generate(prompt: string, options?: LLMOptions): Promise<string>;
}
```

### API Compatibility

Silra.cn is fully OpenAI-compatible:

- ✅ `/v1/embeddings` - Embedding API
- ✅ `/v1/chat/completions` - Chat completion API
- ✅ `/v1/rerank` - Reranking API (optional extension)

### Error Handling

- Network errors → Retry with exponential backoff
- API errors → Clear error messages with HTTP status
- Rate limits → Automatic retry after cooldown

## 🌏 Regional Benefits

| Region | Recommended Provider | Latency |
|--------|---------------------|---------|
| China Mainland | **Silra.cn** | ~50ms |
| Global | OpenAI / Jina | ~100-300ms |
| Local/Offline | Ollama | ~10ms |

## 📚 Documentation

- [Silra.cn Console](https://silra.cn/console)
- [API Documentation](https://docs.silra.cn)
- [Pricing](https://silra.cn/pricing)

## 🤝 Related Issues

- Addresses geographic accessibility for Chinese users
- Complements existing Ollama local provider
- Part of internationalization efforts

## ✅ Checklist

- [x] Provider implementation complete
- [x] Configuration schema updated
- [x] Documentation added
- [x] Testing performed in production environment
- [x] Backward compatibility maintained
- [x] No breaking changes

## 🙏 Acknowledgments

Thanks to the Silra.cn team for providing OpenAI-compatible APIs for the Chinese market.

---

**Author**: OpenClaw User  
**Date**: 2026-04-14  
**Version**: 1.0.0
