# TOON Format Skill for OpenCode

Pre/post-processing middleware for LLM optimization using [Token-Oriented Object Notation (TOON)](https://github.com/toon-format/toon).

## About TOON

TOON is a compact, human-readable data format designed specifically for LLM input. It reduces token usage by ~40-54% while improving data retrieval accuracy.

- **Original Format**: [github.com/toon-format/toon](https://github.com/toon-format/toon)
- **Official Website**: [toonformat.dev](https://toonformat.dev)
- **Specification**: [TOON Spec](https://github.com/toon-format/spec)

## Benefits

- **~40-54% token reduction** for structured tabular data
- **Improved LLM data retrieval accuracy** (73.9% vs 69.7% for JSON)
- **Lossless JSON round-trips** (100% data preservation)
- **Automatic eligibility detection** - only uses TOON when beneficial

## Installation

### For OpenCode

```bash
# Create skill directory
mkdir -p ~/.config/opencode/skills/toon-format
cd ~/.config/opencode/skills/toon-format

# Clone or copy skill files
git clone https://github.com/djdembeck/toon-format-skill .
```

### For Development

```bash
git clone https://github.com/djdembeck/toon-format-skill.git
cd toon-format-skill
bun install
```

## Quick Start

### Using Hooks (Automatic)

```typescript
import { autoTOON } from 'toon-format'

const result = await autoTOON.process(
  {
    systemPrompt: 'You are a data analyst.',
    userMessage: 'Analyze this data.',
    data: {
      users: [
        { id: 1, name: 'Alice', salary: 120000 },
        { id: 2, name: 'Bob', salary: 80000 }
      ]
    }
  },
  async (processedRequest) => {
    // Your LLM call here
    return await llm.complete(processedRequest)
  }
)

console.log(`Token savings: ${result.metrics.percentSaved.toFixed(1)}%`)
console.log('Parsed response:', result.parsedResponse)
```

### Using TOONProcessor (Manual)

```typescript
import { TOONProcessor } from 'toon-format'

const processor = new TOONProcessor()

// Pre-process LLM request
const { request, eligibility } = processor.preProcess({
  systemPrompt: 'You are a data analyst.',
  userMessage: 'Analyze this data.',
  data: { users: [...] }
})

// request.data is now TOON format with token savings
console.log(`Token savings: ${request.metrics?.percentSaved.toFixed(1)}%`)
```

## Automatic Hooks

The hooks API provides automatic pre/post-processing:

### autoTOON.process()

Full request/response cycle with automatic encoding/decoding:

```typescript
import { autoTOON } from 'toon-format'

const result = await autoTOON.process(request, async (processedReq) => {
  return await myLLMClient.complete(processedReq)
})

// Returns:
// - result.originalRequest: original request
// - result.toonRequest: TOON-encoded request
// - result.metrics: token savings
// - result.parsedResponse: decoded response
// - result.tokenSavings: number of tokens saved
```

### withTOON() Wrapper

Higher-order function for wrapping any async function:

```typescript
import { withTOON } from 'toon-format'

const toonWrapped = withTOON(myLLMFunction, { logMetrics: true })
const result = await toonWrapped(request)
```

### autoTOON.wrap()

Wrap an existing LLM client:

```typescript
import { autoTOON } from 'toon-format'

const toonClient = autoTOON.wrap(myOpenAIClient)
const result = await toonClient.complete(request)
```

### autoTOON.middleware()

Express/Fastify middleware:

```typescript
import { autoTOON } from 'toon-format'

app.use(autoTOON.middleware())
// Automatically encodes req.body.data and decodes responses
```

### useTOON() Hook

For React or similar frameworks:

```typescript
import { useTOON } from 'toon-format'

const { processWithTOON, wrap } = useTOON({ logMetrics: true })
```

## Core Functions

### Encode/Decode

```typescript
import { encodeToTOON, decodeFromTOON } from 'toon-format'

const data = { users: [{ id: 1, name: 'Alice' }] }
const toon = encodeToTOON(data)
// users[1]{id,name}:
//   1,Alice

const decoded = decodeFromTOON(toon)
// { users: [{ id: 1, name: 'Alice' }] }
```

### Token Savings Analysis

```typescript
import { calculateTokenSavings } from 'toon-format'

const metrics = calculateTokenSavings({ records: [...] })
console.log(metrics)
// { original: 500, toon: 250, savings: 250, percentSaved: 50 }
```

### Eligibility Analysis

```typescript
import { analyzeEligibility } from 'toon-format'

const eligibility = analyzeEligibility(data)
if (eligibility.shouldUseTOON) {
  console.log(`Use TOON - ${eligibility.percentTabular}% tabular`)
} else {
  console.log(`Skip TOON - ${eligibility.reason}`)
}
```

## TOONProcessor Class

Complete pre/post-processing pipeline:

```typescript
import { TOONProcessor } from 'toon-format'

const processor = new TOONProcessor()

// Pre-process request
const preResult = processor.preProcess(request)
// preResult.request.toonProcessed - true if TOON was applied
// preResult.request.metrics - token savings metrics
// preResult.eligibility - analysis results

// Post-process response
const postResult = processor.postProcess(response)
// postResult.success - whether parsing succeeded
// postResult.parsed - decoded data (if TOON)
// postResult.format - 'toon' | 'json' | 'none'
```

## TOON Format Example

**JSON (verbose):**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
```

**TOON (compact):**
```
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
```

## Running Tests

```bash
bun test
```

## Examples

See [`examples/basic.ts`](examples/basic.ts) and [`examples/hooks.ts`](examples/hooks.ts) for usage examples:

```bash
bun run examples/basic.ts
bun run examples/hooks.ts
```

## Configuration

Default thresholds can be customized:

```typescript
const processor = new TOONProcessor({
  eligibility: {
    minTabularPercent: 60,    // Minimum % tabular arrays
    maxNestedDepth: 4,        // Maximum nesting depth
    minUniformityScore: 0.8   // Minimum uniformity score
  }
})

// Or with hooks
const result = await autoTOON.process(request, llmCall, {
  minTabularPercent: 70,
  maxNestedDepth: 3,
  logMetrics: true
})
```

## When to Use TOON

| Data Structure | TOON Benefit |
|----------------|--------------|
| Uniform arrays of objects | ✅ Excellent (40-54% savings) |
| Semi-uniform data | ⚠️ Moderate (20-40% savings) |
| Deeply nested objects | ❌ Not recommended |
| Non-tabular structures | ❌ Not recommended |

## Benchmark Results

| Format | Accuracy | Tokens | Efficiency |
|--------|-----------|--------|------------|
| TOON | 73.9% | 2,744 | 26.9 acc%/1K tok |
| JSON | 69.7% | 4,545 | 15.3 acc%/1K tok |

*Source: TOON benchmarks (toonformat.dev)*

## License

MIT - See LICENSE file

---

Built with ❤️ using the [TOON Format](https://github.com/toon-format/toon)
