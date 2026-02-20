/**
 * Basic Usage Examples for TOON Format Skill
 */

import { 
  encodeToTOON, 
  decodeFromTOON, 
  calculateTokenSavings,
  analyzeEligibility,
  TOONProcessor 
} from '../index'

console.log('=== Example 1: Simple Encode/Decode ===')

const userData = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', department: 'Engineering' },
    { id: 2, name: 'Bob', role: 'user', department: 'Sales' },
    { id: 3, name: 'Charlie', role: 'user', department: 'Marketing' }
  ]
}

const toonOutput = encodeToTOON(userData)
console.log('TOON output:')
console.log(toonOutput)

const decoded = decodeFromTOON(toonOutput)
console.log('\nDecoded matches original:', JSON.stringify(decoded) === JSON.stringify(userData))

console.log('\n=== Example 2: Token Savings ===')

const metrics = calculateTokenSavings(userData)
console.log(`Original JSON tokens: ${metrics.original}`)
console.log(`TOON tokens: ${metrics.toon}`)
console.log(`Savings: ${metrics.savings} (${metrics.percentSaved.toFixed(1)}%)`)

console.log('\n=== Example 3: Eligibility Analysis ===')

const eligibility = analyzeEligibility(userData)
console.log(`Percent tabular: ${eligibility.percentTabular}%`)
console.log(`Nested depth: ${eligibility.nestedDepth}`)
console.log(`Should use TOON: ${eligibility.shouldUseTOON}`)
console.log(`Reason: ${eligibility.reason}`)

console.log('\n=== Example 4: TOONProcessor Class ===')

const processor = new TOONProcessor()

const request = {
  systemPrompt: 'You are a data analyst assistant.',
  userMessage: 'Analyze these employee records.',
  data: {
    employees: [
      { id: 1, name: 'Alice', salary: 120000, department: 'Engineering' },
      { id: 2, name: 'Bob', salary: 80000, department: 'Sales' },
      { id: 3, name: 'Charlie', salary: 95000, department: 'Marketing' }
    ]
  }
}

const preResult = processor.preProcess(request)
console.log('Request pre-processed:', preResult.request.toonProcessed)
console.log('Token savings:', preResult.request.metrics?.percentSaved?.toFixed(1) + '%')

const llmResponse = {
  content: `results[1]{avgSalary,total}:
  101250,3`
}

const postResult = processor.postProcess(llmResponse)
console.log('\nResponse parsed:', postResult.parsed?.results)

console.log('\n=== Example 5: Large Dataset ===')

const largeDataset = {
  transactions: Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    amount: Math.floor(Math.random() * 10000) / 100,
    category: ['food', 'transport', 'shopping'][Math.floor(Math.random() * 3)],
    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
  }))
}

const largeMetrics = calculateTokenSavings(largeDataset)
console.log(`1000 transactions - Savings: ${largeMetrics.percentSaved.toFixed(1)}%`)

console.log('\n=== Example 6: Nested Data ===')

const nestedData = {
  company: {
    departments: [
      {
        name: 'Engineering',
        head: 'Alice',
        employees: [
          { name: 'Bob', skills: ['TypeScript', 'React'] },
          { name: 'Charlie', skills: ['Python', 'AWS'] }
        ]
      }
    ]
  }
}

const nestedEligibility = analyzeEligibility(nestedData)
console.log(`Nested data eligibility: ${nestedEligibility.shouldUseTOON}`)
console.log(`Percent tabular: ${nestedEligibility.percentTabular}%`)