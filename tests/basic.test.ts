/**
 * Basic Tests for TOON Format Skill
 */

import { 
  encodeToTOON, 
  decodeFromTOON, 
  calculateTokenSavings,
  analyzeEligibility,
  TOONProcessor 
} from '../index'

describe('encodeToTOON', () => {
  test('encodes simple object', () => {
    const data = { name: 'Alice', age: 30 }
    const toon = encodeToTOON(data)
    expect(toon).toContain('name')
    expect(toon).toContain('Alice')
    expect(toon).toContain('age')
    expect(toon).toContain('30')
  })

  test('encodes array of objects', () => {
    const data = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' }
      ]
    }
    const toon = encodeToTOON(data)
    expect(toon).toContain('[2]')
    expect(toon).toContain('{id,name,role}')
    expect(toon).toContain('1')
    expect(toon).toContain('2')
  })

  test('encodes nested structures', () => {
    const data = {
      company: {
        name: 'Acme',
        employees: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      }
    }
    const toon = encodeToTOON(data)
    expect(toon).toContain('company')
    expect(toon).toContain('Acme')
    expect(toon).toContain('[2]')
  })
})

describe('decodeFromTOON', () => {
  test('decodes simple TOON to object', () => {
    const toon = 'name: Alice\nage: 30'
    const decoded = decodeFromTOON(toon)
    expect(decoded.name).toBe('Alice')
    expect(decoded.age).toBe(30)
  })

  test('decodes array of objects', () => {
    const toon = `users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user`
    
    const decoded = decodeFromTOON(toon)
    expect(decoded.users).toHaveLength(2)
    expect(decoded.users[0].id).toBe(1)
    expect(decoded.users[0].name).toBe('Alice')
    expect(decoded.users[1].id).toBe(2)
    expect(decoded.users[1].name).toBe('Bob')
  })
})

describe('encode/decode round-trip', () => {
  test('round-trips complex data', () => {
    const original = {
      company: 'Acme Corp',
      employees: [
        { id: 1, name: 'Alice', salary: 120000 },
        { id: 2, name: 'Bob', salary: 80000 }
      ]
    }
    
    const toon = encodeToTOON(original)
    const decoded = decodeFromTOON(toon)
    
    expect(decoded.company).toBe(original.company)
    expect(decoded.employees).toHaveLength(original.employees.length)
    expect(decoded.employees[0].name).toBe(original.employees[0].name)
    expect(decoded.employees[0].salary).toBe(original.employees[0].salary)
  })
})

describe('calculateTokenSavings', () => {
  test('calculates token savings correctly', () => {
    const data = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' }
      ]
    }
    
    const metrics = calculateTokenSavings(data)
    
    expect(metrics.original).toBeGreaterThan(0)
    expect(metrics.toon).toBeGreaterThan(0)
    expect(metrics.savings).toBeGreaterThan(0)
    expect(metrics.percentSaved).toBeGreaterThan(0)
    expect(metrics.percentSaved).toBeLessThan(100)
  })

  test('shows better savings for tabular data', () => {
    const tabularData = {
      records: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `User${i + 1}`,
        value: i * 100
      }))
    }
    
    const nestedData = {
      complex: {
        deeply: {
          nested: {
            value: 'test'
          }
        }
      }
    }
    
    const tabularMetrics = calculateTokenSavings(tabularData)
    const nestedMetrics = calculateTokenSavings(nestedData)
    
    expect(tabularMetrics.percentSaved).toBeGreaterThan(nestedMetrics.percentSaved)
  })
})

describe('analyzeEligibility', () => {
  test('identifies highly tabular data', () => {
    const tabularData = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
        { id: 3, name: 'Charlie', role: 'user' }
      ]
    }
    
    const eligibility = analyzeEligibility(tabularData)
    
    expect(eligibility.percentTabular).toBeGreaterThan(80)
    expect(eligibility.uniformityScore).toBeGreaterThan(0.9)
    expect(eligibility.shouldUseTOON).toBe(true)
  })

  test('identifies non-tabular data', () => {
    const nestedData = {
      level1: {
        level2: {
          level3: {
            level4: {
              deep: 'value'
            }
          }
        }
      }
    }
    
    const eligibility = analyzeEligibility(nestedData)
    
    expect(eligibility.percentTabular).toBe(0)
    expect(eligibility.shouldUseTOON).toBe(false)
  })
})

describe('TOONProcessor', () => {
  let processor: TOONProcessor

  beforeEach(() => {
    processor = new TOONProcessor()
  })

  describe('preProcess', () => {
    test('pre-processes tabular data', () => {
      const request = {
        systemPrompt: 'Test prompt',
        userMessage: 'Analyze this',
        data: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
          ]
        }
      }

      const result = processor.preProcess(request)

      expect(result.request.toonProcessed).toBe(true)
      expect(result.request.data).toContain('[2]')
      expect(result.request.metrics).toBeDefined()
      expect(result.eligibility.shouldUseTOON).toBe(true)
    })

    test('skips non-tabular data', () => {
      const request = {
        systemPrompt: 'Test prompt',
        userMessage: 'Analyze this',
        data: {
          deep: {
            nested: {
              value: 'test'
            }
          }
        }
      }

      const result = processor.preProcess(request)

      expect(result.request.toonProcessed).toBe(false)
      expect(result.eligibility.shouldUseTOON).toBe(false)
    })

    test('handles null data gracefully', () => {
      const request = {
        systemPrompt: 'Test prompt',
        userMessage: 'Analyze this',
        data: null
      }

      const result = processor.preProcess(request)

      expect(result.request.toonProcessed).toBe(false)
    })
  })

  describe('postProcess', () => {
    test('decodes TOON response', () => {
      const response = {
        content: `results[1]{value,count}:
  "success",42`
      }

      const result = processor.postProcess(response)

      expect(result.success).toBe(true)
      expect(result.format).toBe('toon')
      expect(result.parsed.results[0].value).toBe('success')
      expect(result.parsed.results[0].count).toBe(42)
    })

    test('handles non-TOON content', () => {
      const response = {
        content: 'not toon format'
      }

      const result = processor.postProcess(response)

      expect(result.success).toBe(false)
      expect(result.format).toBe('none')
    })

    test('handles empty content', () => {
      const response = {
        content: ''
      }

      const result = processor.postProcess(response)

      expect(result.success).toBe(false)
    })
  })

  describe('configuration', () => {
    test('updates configuration', () => {
      processor.updateConfig({
        eligibility: {
          minTabularPercent: 70,
          maxNestedDepth: 1,
          minUniformityScore: 0.9
        }
      })

      const config = processor.getConfig()
      expect(config.eligibility.minTabularPercent).toBe(70)
      expect(config.eligibility.maxNestedDepth).toBe(1)
    })
  })
})

describe('edge cases', () => {
  test('handles empty array', () => {
    const data = { items: [] }
    const toon = encodeToTOON(data)
    expect(toon).toContain('[0]')
  })

  test('handles single item array', () => {
    const data = { items: [{ id: 1, name: 'Test' }] }
    const toon = encodeToTOON(data)
    expect(toon).toContain('[1]')
  })

  test('handles unicode characters', () => {
    const data = { text: 'こんにちは World' }
    const toon = encodeToTOON(data)
    expect(toon).toContain('こんにちは')
  })

  test('handles large datasets', () => {
    const data = {
      records: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
        timestamp: Date.now()
      }))
    }
    
    const toon = encodeToTOON(data)
    expect(toon).toContain('[1000]')
    
    const decoded = decodeFromTOON(toon)
    expect(decoded.records).toHaveLength(1000)
  })
})