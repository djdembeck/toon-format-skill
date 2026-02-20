/**
 * Middleware Integration Examples for TOON Format Skill
 */

import { 
  preProcessRequest, 
  postProcessResponse,
  TOONProcessor 
} from '../index'

console.log('=== Example 1: LLM Client Wrapper ===')

class TOONLLMClient {
  private processor: TOONProcessor

  constructor() {
    this.processor = new TOONProcessor()
  }

  async complete(request: { systemPrompt: string, userMessage: string, data?: any }): Promise<any> {
    const { request: processed, eligibility } = this.processor.preProcess(request)
    
    if (processed.toonProcessed) {
      console.log(`TOON enabled: ${processed.metrics?.percentSaved.toFixed(1)}% token savings`)
    }

    const response = await this.callLLM(processed)
    const result = this.processor.postProcess(response)
    
    return result.parsed || response.content
  }

  private async callLLM(request: any): Promise<any> {
    return {
      content: `analysis[1]{result,confidence}:
  "Data analyzed successfully",0.92`
    }
  }
}

const llmClient = new TOONLLMClient()
await llmClient.complete({
  systemPrompt: 'You are a data analyst.',
  userMessage: 'Analyze employee data.',
  data: {
    employees: [
      { id: 1, name: 'Alice', salary: 120000 },
      { id: 2, name: 'Bob', salary: 80000 }
    ]
  }
})

console.log('\n=== Example 2: Data Pipeline ===')

class TOONPipeline {
  private processor: TOONProcessor

  constructor() {
    this.processor = new TOONProcessor()
  }

  async process(data: any): Promise<any> {
    const { request, eligibility } = this.processor.preProcess({
      systemPrompt: '',
      userMessage: '',
      data
    })

    console.log(`TOON eligibility: ${eligibility.percentTabular}% tabular`)

    if (request.toonProcessed) {
      console.log(`Token savings: ${request.metrics?.percentSaved.toFixed(1)}%`)
    }

    return request.data
  }
}

const pipeline = new TOONPipeline()
await pipeline.process({
  transactions: [
    { id: 1, amount: 100, category: 'food' },
    { id: 2, amount: 250, category: 'transport' }
  ]
})

console.log('\n=== Example 3: LLM Agent Integration ===')

class TOONAgent {
  private memory: any[] = []
  private processor: TOONProcessor

  constructor() {
    this.processor = new TOONProcessor()
  }

  async think(input: { task: string; data?: any }): Promise<any> {
    const { request, eligibility } = this.processor.preProcess({
      systemPrompt: 'You are a TOON-enabled agent.',
      userMessage: input.task,
      data: input.data
    })

    console.log(`Data eligibility: ${eligibility.shouldUseTOON ? 'TOON' : 'JSON'}`)

    const response = {
      content: `result[1]{answer,confidence}:
  "Analysis complete",0.95`
    }

    const postResult = this.processor.postProcess(response)

    this.memory.push({
      input: request,
      output: postResult.parsed,
      timestamp: Date.now()
    })

    return postResult.parsed
  }
}

const agent = new TOONAgent()
await agent.think({
  task: 'Analyze metrics',
  data: {
    metrics: [
      { name: 'revenue', value: 500000 },
      { name: 'cost', value: 200000 }
    ]
  }
})

console.log('\n=== Example 4: Health Check ===')

class TOONHealthChecker {
  async check(data: any): Promise<{ eligible: boolean; savings: number }> {
    const { request, eligibility } = preProcessRequest({
      systemPrompt: '',
      userMessage: '',
      data
    })

    return {
      eligible: request.toonProcessed,
      savings: request.metrics?.percentSaved || 0
    }
  }
}

const healthChecker = new TOONHealthChecker()
await healthChecker.check({
  users: [
    { id: 1, name: 'Alice', email: 'alice@test.com' },
    { id: 2, name: 'Bob', email: 'bob@test.com' }
  ]
})