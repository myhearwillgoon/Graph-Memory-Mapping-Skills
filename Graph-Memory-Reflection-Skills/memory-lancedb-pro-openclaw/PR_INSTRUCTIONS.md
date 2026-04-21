# PR Instructions - memory-lancedb-pro Silra.cn Support

## 📋 Pre-Submission Checklist

Before submitting your PR, ensure all items are complete:

### Code Quality
- [ ] TypeScript code follows project style guide
- [ ] All functions have JSDoc comments
- [ ] Error handling is comprehensive
- [ ] No console.log() statements (use logger)
- [ ] Code is properly indented (2 spaces)

### Testing
- [ ] Provider implementation tested locally
- [ ] API key validation works
- [ ] Embedding generation verified
- [ ] LLM generation tested
- [ ] Reranker tested (if applicable)
- [ ] Error scenarios handled gracefully
- [ ] Rate limiting retry logic tested

### Documentation
- [ ] README.md updated with China region section
- [ ] CONFIG_SILRA.md added
- [ ] Code comments in English
- [ ] API key setup instructions clear
- [ ] Troubleshooting section included

### Backward Compatibility
- [ ] No breaking changes to existing APIs
- [ ] Existing providers still work
- [ ] Default behavior unchanged
- [ ] Migration guide provided

---

## 🚀 Step-by-Step Submission Process

### Step 1: Fork the Repository

1. Go to https://github.com/CortexReach/memory-lancedb-pro
2. Click "Fork" button (top right)
3. Wait for fork to complete
4. Your fork: `https://github.com/YOUR_USERNAME/memory-lancedb-pro`

### Step 2: Clone Your Fork

```bash
cd /mnt/d/OneDrive\ -\ Imperial\ College\ London/OpenClaw-Shared/
git clone git@github.com:YOUR_USERNAME/memory-lancedb-pro.git
cd memory-lancedb-pro
```

### Step 3: Add Upstream Remote

```bash
git remote add upstream https://github.com/CortexReach/memory-lancedb-pro.git
git fetch upstream
```

### Step 4: Create Feature Branch

```bash
git checkout -b feat/silra-china-provider
```

### Step 5: Copy Implementation Files

```bash
# Copy provider implementation
cp /mnt/d/OneDrive\ -\ Imperial\ College\ London/OpenClaw-Shared/pr-prep/memory-lancedb-pro-silra/src-providers-silra.ts \
   src/providers/silra.ts

# Copy documentation
cp /mnt/d/OneDrive\ -\ Imperial\ College\ London/OpenClaw-Shared/pr-prep/memory-lancedb-pro-silra/CONFIG_SILRA.md \
   docs/providers/silra.md

# Create docs directory if needed
mkdir -p docs/providers
```

### Step 6: Update Provider Registry

Edit `src/providers/index.ts`:

```typescript
// Add import
import { createSilraProvider } from './silra';

// Add to provider registry
export const providers = {
  // ... existing providers
  silra: createSilraProvider,
};
```

### Step 7: Update Config Schema

Edit `openclaw.plugin.json`:

```json
{
  "properties": {
    "embedding": {
      "properties": {
        "provider": {
          "enum": ["openai", "jina", "gemini", "ollama", "silra"]
        }
      }
    },
    "llm": {
      "properties": {
        "provider": {
          "enum": ["openai", "jina", "gemini", "ollama", "silra"]
        }
      }
    },
    "rerank": {
      "properties": {
        "provider": {
          "enum": ["jina", "siliconflow", "silra", null]
        }
      }
    }
  }
}
```

### Step 8: Update README.md

Add China region section to README.md:

```markdown
## 🌏 Regional Providers

### China Mainland

For users in China, we recommend using Silra.cn for lower latency and better connectivity:

```json
{
  "embedding": {
    "provider": "silra",
    "model": "text-embedding-v4"
  },
  "llm": {
    "provider": "silra",
    "model": "qwen3-8b"
  }
}
```

See [docs/providers/silra.md](docs/providers/silra.md) for detailed setup.
```

### Step 9: Commit Changes

```bash
git add .
git commit -m "feat: add Silra.cn provider for China mainland users

- Implement SilraEmbeddingProvider with OpenAI-compatible API
- Implement SilraLLMProvider for Smart Extraction
- Implement SilraRerankProvider for cross-encoder reranking
- Add comprehensive error handling and retry logic
- Add documentation and configuration examples
- Support all major Silra.cn models (embedding, LLM, reranker)

Fixes: Geographic accessibility for Chinese users
Related: Opens support for other regional providers"
```

### Step 10: Push to Your Fork

```bash
git push origin feat/silra-china-provider
```

### Step 11: Create Pull Request

1. Go to your fork: `https://github.com/YOUR_USERNAME/memory-lancedb-pro`
2. Click "Pull requests" → "New pull request"
3. Base repository: `CortexReach/memory-lancedb-pro`
4. Base branch: `main`
5. Head repository: `YOUR_USERNAME/memory-lancedb-pro`
6. Compare branch: `feat/silra-china-provider`
7. Click "Create pull request"

### Step 12: Fill PR Template

Use the PR_DESCRIPTION.md as your PR description:

```markdown
## Description
[Paste contents from PR_DESCRIPTION.md]

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [x] Tested locally with real API calls
- [x] Tested error scenarios
- [x] Tested rate limiting
- [ ] Added unit tests (if applicable)

## Checklist
- [x] Code follows project style guide
- [x] Documentation updated
- [x] No breaking changes
- [x] Backward compatible
```

---

## 📊 Expected Review Timeline

| Stage | Duration | What Happens |
|-------|----------|--------------|
| Initial Review | 1-3 days | Maintainer reviews code quality |
| Technical Review | 3-7 days | Testing and validation |
| Feedback | 7-14 days | Comments and revision requests |
| Merge | 14-21 days | Final approval and merge |

---

## 💡 Tips for Faster Review

1. **Small, Focused PR**: This PR is focused on one provider - good!
2. **Clear Description**: Use the provided PR_DESCRIPTION.md
3. **Responsive**: Reply to comments quickly
4. **Flexible**: Be open to suggested changes
5. **Tested**: Emphasize that you've tested in production

---

## 🔧 Common Review Comments & Responses

### "Can you add unit tests?"

**Response:**
> "Happy to add tests! Should I use Jest or the existing test framework? I'll create a separate commit with tests."

### "Consider using the existing HTTP client"

**Response:**
> "Good catch! I'll refactor to use the shared HTTP client in `src/utils/http.ts`. Will update in next commit."

### "Add rate limit handling documentation"

**Response:**
> "Added to CONFIG_SILRA.md troubleshooting section. Rate limiting is handled with exponential backoff (built into provider)."

---

## 📞 Post-Submission

After submitting:

1. **Watch the PR**: Enable notifications for comments
2. **Be Responsive**: Reply within 24-48 hours
3. **Make Changes Promptly**: Push fixes as new commits
4. **Stay Professional**: Accept constructive feedback gracefully

---

## ✅ Success Criteria

Your PR is successful when:

- [ ] Code is merged into main branch
- [ ] Silra provider appears in next release
- [ ] Documentation is published
- [ ] Chinese users can use Silra.cn seamlessly

---

## 🆘 If PR is Rejected

Don't worry! Common reasons:

1. **Not a good fit**: Project direction changed
2. **Maintenance burden**: Too complex to maintain
3. **Better alternative**: Another solution preferred

**Next Steps:**
- Ask for feedback
- Consider publishing as independent plugin
- Maintain your fork for Chinese users

---

**Good luck! 🚀**

This PR will help thousands of Chinese users access memory-lancedb-pro with better performance!

---

**Author**: OpenClaw User  
**Date**: 2026-04-14  
**Version**: 1.0.0
