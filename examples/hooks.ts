/**
 * Automatic TOON Hooks Examples
 * 
 * Shows how to use automatic pre/post-processing
 */

import { autoTOON, withTOON, useTOON } from '../hooks'

console.log('=== Example 1: Using autoTOON.process() ===')

const data = {
  users: [
    { id: 1, name: 'Alice', salary: 120000, dept: 'Engineering' },
    { id: 2, name: 'Bob', salary: 80000, dept: 'Sales' }
  ]
}

const result = await autoTOON.process(
  {
    systemPrompt: 'You are a data analyst.',
    userMessage: 'Calculate average salary.',
    data
  },
  async (processedReq) => {
    console.log('TOON sent to LLM:')
    console.log(processedReq.data)
    
    return {
      content: `result[1]{avgSalary,totalEmployees}:
  100000,2`
    }
  }
)

console.log('\nToken savings:', result.metrics?.percentSaved?.toFixed(1) + '%')
console.log('Parsed response:', result.parsedResponse)

console.log('\n=== Example 2: Using withTOON() wrapper ===')

const myLLMFunction = async (req: any) => {
  return { content: 'LLM processed request' }
}

const toonWrapped = withTOON(myLLMFunction, { logMetrics: true })
const wrappedResult = await toonWrapped({
  systemPrompt: 'Analyze',
  userMessage: 'Process this',
  data: { items: [{ id: 1, value: 100 }] }
})

console.log('Wrapped result:', wrappedResult)

console.log('\n=== Example 3: Using useTOON() hook ===')

const { processWithTOON } = useTOON({ logMetrics: true })

const hookResult = await processWithTOON(
  {
    systemPrompt: 'You are an analyst',
    userMessage: 'Summarize',
    data: {
      transactions: [
        { id: 1, amount: 500, category: 'food' },
        { id: 2, amount: 1200, category: 'rent' },
        { id: 3, amount: 300, category: 'transport' }
      ]
    }
  },
  async (req) => {
    return { content: `summary[1]{total,avg}: 2000,666.67` }
  }
)

console.log('Hook result:', hookResult.parsedResponse)
console.log('Saved tokens:', hookResult.tokenSavings)

console.log('\n=== Example 4: Wrapping existing LLM client ===')

const myOpenAIClient = {
  async complete(request: any) {
    console.log('OpenAI received:', request.data.substring(0, 50), '...')
    return { content: `analysis[1]{result}: success` }
  }
}

const toonClient = autoTOON.wrap(myOpenAIClient)

const clientResult = await toonClient.complete({
  systemPrompt: 'Analyze data',
  userMessage: 'Process these records',
  data: { records: [{ id: 1 }, { id: 2 }] }
})

console.log('Client result:', clientResult)

console.log('\n=== Summary ===')
console.log('TOON hooks automatically:')
console.log('1. Encode your data to TOON before sending to LLM')
console.log('2. Decode TOON responses back to JSON')
console.log('3. Log token savings')
console.log('4. Only process when beneficial (>60% tabular data)')