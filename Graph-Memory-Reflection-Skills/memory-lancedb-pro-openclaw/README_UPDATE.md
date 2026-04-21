# README.md Update - China Region Section

Add this section to the main README.md after the "Quick Start" section:

---

## 🌏 Regional Providers

### China Mainland (Recommended for Chinese Users)

For users in China, we recommend using **Silra.cn** for lower latency and better connectivity:

```json
{
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
  }
}
```

**Benefits:**
- 🚀 Low latency (~50ms in China vs ~3000ms for US APIs)
- 🌐 Reliable connectivity within Great Firewall
- 💰 Competitive pricing (CNY settlement available)
- 📚 Chinese language optimized models

**Get Started:**
1. Get API key: https://silra.cn/console/api-key
2. Set environment variable: `export SILRA_API_KEY="sk-xxx"`
3. Use config above in your `openclaw.json`

**Documentation:** See [docs/providers/silra.md](docs/providers/silra.md) for detailed setup guide.

---

### Other Regional Options

| Region | Provider | Latency | Notes |
|--------|----------|---------|-------|
| Global | OpenAI | ~100-300ms | Best overall quality |
| Global | Jina | ~100-200ms | Specialized in embeddings |
| China | **Silra.cn** | ~50ms | **Best for China** |
| Local | Ollama | ~10ms | Fully offline, no API keys |

---

## Provider Comparison

| Feature | OpenAI | Jina | Silra.cn | Ollama |
|---------|--------|------|----------|--------|
| Embedding Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| LLM Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Reranker | ❌ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ |
| Latency (China) | 🔴 Slow | 🟡 Medium | 🟢 Fast | 🟢 Fastest |
| Cost | 💰💰💰 | 💰💰 | 💰💰 | 🆓 Free |
| Setup | Easy | Easy | Easy | Medium |

---

**End of README Update**
