/**
 * TOON Format Automatic Hooks
 * 
 * Automatic pre/post-processing middleware for OpenCode LLM calls.
 * 
 * Usage:
 *   import { withTOON } from './hooks'
 *   
 *   // Wrap any async function that sends data to LLM
 *   const result = await withTOON(async (data) => {
 *     return await llm.complete(data)
 *   }, { users: [...] })
 * 
 * Or use the automatic wrapper:
 *   import { autoTOON } from './hooks'
 *   
 *   // Auto-wraps your entire request/response cycle
 *   const response = await autoTOON.process({
 *     systemPrompt: '...',
 *     userMessage: '...',
 *     data: { users: [...] }
 *   })
 */

import { encodeToTOON, decodeFromTOON, calculateTokenSavings, analyzeEligibility, TOONProcessor } from './index'

export interface TOONHookConfig {
  /** Auto-add TOON format instructions to system prompt */
  addInstructions?: boolean
  /** Minimum tabular % to use TOON (default: 60) */
  minTabularPercent?: number
  /** Maximum nested depth allowed (default: 4) */
  maxNestedDepth?: number
  /** Log token savings to console */
  logMetrics?: boolean
}

const DEFAULT_HOOK_CONFIG: TOONHookConfig = {
  addInstructions: true,
  minTabularPercent: 60,
  maxNestedDepth: 4,
  logMetrics: true
}

/**
 * Automatic TOON processor with hooks
 * 
 * Usage:
 *   import { autoTOON } from './hooks'
 *   
 *   const result = await autoTOON.process({
 *     systemPrompt: 'You are a data analyst',
 *     userMessage: 'Analyze these records',
 *     data: { users: [...] }
 *   }, async (processedRequest) => {
 *     // Your LLM call here
 *     return await llm.complete(processedRequest)
 *   })
 */
export class AutoTOON {
  private config: TOONHookConfig
  private processor: TOONProcessor
  
  constructor(config?: TOONHookConfig) {
    this.config = { ...DEFAULT_HOOK_CONFIG, ...config }
    this.processor = new TOONProcessor({
      eligibility: {
        minTabularPercent: this.config.minTabularPercent || 60,
        maxNestedDepth: this.config.maxNestedDepth || 4,
        minUniformityScore: 0.8
      }
    })
  }
  
  /**
   * Process request with automatic TOON encoding/decoding
   * 
   * @param request - Request with data to process
   * @param llmCall - Your LLM completion function
   * @returns Processed response with decoded data
   * 
   * Example:
   *   const result = await autoTOON.process(request, async (req) => {
   *     return await fetch('https://api.openai.com/v1/chat/completions', {
   *       method: 'POST',
   *       body: JSON.stringify(req)
   *     })
   *   })
   */
  async process<T extends { systemPrompt: string; userMessage: string; data?: any }>(
    request: T,
    llmCall: (processedRequest: any) => Promise<{ content: string }>
  ): Promise<{
    originalRequest: T
    toonRequest: any
    eligibility: any
    metrics: any
    llmResponse: { content: string }
    parsedResponse: any
    tokenSavings: number
  }> {
    // Step 1: Pre-process (JSON -> TOON)
    const { request: toonRequest, eligibility } = this.processor.preProcess(request)
    
    if (this.config.logMetrics && toonRequest.metrics) {
      console.log(`📝 TOON: ${toonRequest.metrics.percentSaved.toFixed(1)}% token savings (${toonRequest.metrics.savings} tokens)`)
    }
    
    // Step 2: Add TOON instructions if enabled
    if (this.config.addInstructions && toonRequest.toonProcessed) {
      toonRequest.systemPrompt = this.addTOONInstructions(toonRequest.systemPrompt)
    }
    
    // Step 3: Call LLM with processed data
    const llmResponse = await llmCall(toonRequest)
    
    // Step 4: Post-process (TOON -> JSON)
    const postResult = this.processor.postProcess(llmResponse)
    
    return {
      originalRequest: request,
      toonRequest,
      eligibility,
      metrics: toonRequest.metrics,
      llmResponse,
      parsedResponse: postResult.parsed || llmResponse.content,
      tokenSavings: toonRequest.metrics?.savings || 0
    }
  }
  
  /**
   * Wrap an existing LLM client for automatic TOON processing
   * 
   * @param client - Your LLM client with a 'complete' method
   * @returns Wrapped client that auto-processes TOON
   * 
   * Example:
   *   const toonClient = autoTOON.wrap(myOpenAIClient)
   *   const result = await toonClient.complete({
   *     systemPrompt: '...',
   *     userMessage: '...',
   *     data: { users: [...] }
   *   })
   */
  wrap<T extends { complete: (req: any) => Promise<any> }>(client: T): T {
    const self = this
    
    return new Proxy(client, {
      get(target, prop) {
        if (prop === 'complete') {
          return async (request: any) => {
            const result = await self.process(request, async (processedReq) => {
              return await target.complete(processedReq)
            })
            return result.parsedResponse
          }
        }
        return target[prop as keyof T]
      }
    }) as T
  }
  
  /**
   * Create a middleware function for Express/Fastify/etc
   * 
   * @returns Middleware function
   * 
   * Example (Express):
   *   app.use(autoTOON.middleware())
   *   // Now req.body.data is auto-converted to TOON if eligible
   */
  middleware() {
    const self = this
    
    return async (req: any, res: any, next: any) => {
      if (req.body?.data) {
        const { request, eligibility } = self.processor.preProcess({
          systemPrompt: req.body.systemPrompt || '',
          userMessage: req.body.userMessage || '',
          data: req.body.data
        })
        
        req.toonMetadata = {
          eligibility,
          metrics: request.metrics,
          toonProcessed: request.toonProcessed
        }
        
        if (request.toonProcessed) {
          req.body.data = request.data
          if (self.config.addInstructions) {
            req.body.systemPrompt = self.addTOONInstructions(req.body.systemPrompt)
          }
        }
      }
      
      // Wrap res.json to auto-decode TOON responses
      const originalJson = res.json.bind(res)
      res.json = (body: any) => {
        if (typeof body === 'string') {
          const decoded = self.processor.postProcess({ content: body })
          if (decoded.success && decoded.parsed) {
            return originalJson(decoded.parsed)
          }
        }
        return originalJson(body)
      }
      
      next()
    }
  }
  
  private addTOONInstructions(prompt: string): string {
    return `${prompt}

## Data Format

Structured data uses TOON (Token-Oriented Object Notation):
\`\`\`toon
arrayName[N]{field1,field2}:
  value1,value2
  value3,value4
\`\`\`

- [N] indicates array length
- Values are comma-separated
- Use TOON format for structured responses to save tokens.
`
  }
}

/**
 * Global autoTOON instance
 */
export const autoTOON = new AutoTOON()

/**
 * Higher-order function to wrap any function with TOON processing
 * 
 * Usage:
 *   const toonWrapped = withTOON(myDataFunction, { minTabularPercent: 60 })
 *   const result = await toonWrapped({ users: [...] })
 * 
 * @param fn - Function to wrap
 * @param config - TOON configuration
 * @returns Wrapped function
 */
export function withTOON<T extends (data: any) => Promise<any>>(
  fn: T,
  config?: TOONHookConfig
): (request: { systemPrompt: string; userMessage: string; data?: any }) => Promise<any> {
  const processor = new AutoTOON(config)
  
  return async (request: { systemPrompt: string; userMessage: string; data?: any }) => {
    return await processor.process(request, async (processedReq) => {
      return await fn(processedReq)
    })
  }
}

/**
 * Decorator for class methods
 * 
 * Usage:
 *   class MyService {
 *     @autoTOONProcess()
 *     async analyze(data: any) {
 *       return await this.llm.complete(data)
 *     }
 *   }
 * 
 * Note: Requires TypeScript experimental decorators enabled
 */
export function autoTOONProcess(config?: TOONHookConfig) {
  const processor = new AutoTOON(config)
  
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0]
      
      if (!request || !request.data) {
        return await originalMethod.apply(this, args)
      }
      
      return await processor.process(request, async (processedReq) => {
        return await originalMethod.apply(this, [processedReq, ...args.slice(1)])
      })
    }
    
    return descriptor
  }
}

/**
 * React Hook for automatic TOON processing
 * 
 * Usage:
 *   function MyComponent() {
 *     const { processWithTOON, metrics } = useTOON()
 *     
 *     const handleSubmit = async (data) => {
 *       const result = await processWithTOON(data, async (req) => {
 *         return await fetch('/api/llm', { body: JSON.stringify(req) })
 *       })
 *       console.log(result.parsedResponse)
 *     }
 *   }
 */
export function useTOON(config?: TOONHookConfig) {
  const processor = new AutoTOON(config)
  
  return {
    processWithTOON: processor.process.bind(processor),
    wrap: processor.wrap.bind(processor),
    middleware: processor.middleware.bind(processor),
    config
  }
}

/**
 * CLI Helper - Auto-convert stdin/stdout
 * 
 * Usage:
 *   echo '{"users": [...]}' | npx toon-format --auto
 * 
 * Or in your code:
 *   import { autoTOONCLI } from './hooks'
 *   autoTOONCLI()
 */
export function autoTOONCLI() {
  const processor = new AutoTOON({ logMetrics: true })
  
  let input = ''
  
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => { input += chunk })
  process.stdin.on('end', async () => {
    try {
      const data = JSON.parse(input)
      const toon = encodeToTOON(data)
      console.log(toon)
      
      const metrics = calculateTokenSavings(data)
      console.error(`Token savings: ${metrics.percentSaved.toFixed(1)}%`)
    } catch (e) {
      console.error('Error:', e)
      process.exit(1)
    }
  })
}