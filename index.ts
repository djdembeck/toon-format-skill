/**
 * TOON Format Skill for OpenCode
 * 
 * Pre/post-processing middleware for LLM optimization using
 * Token-Oriented Object Notation (TOON)
 * 
 * Benefits:
 * - ~40% token reduction for structured data
 * - Improved LLM data retrieval accuracy
 * - Lossless JSON round-trips
 */

import { encode as toonEncode, decode as toonDecode } from '@toon-format/toon'

export { toonEncode as encode, toonDecode as decode }

export interface TokenMetrics {
  original: number
  toon: number
  savings: number
  percentSaved: number
}

export interface EligibilityAnalysis {
  percentTabular: number
  nestedDepth: number
  uniformityScore: number
  shouldUseTOON: boolean
  reason: string
}

export interface TOONConfig {
  eligibility: {
    minTabularPercent: number
    maxNestedDepth: number
    minUniformityScore: number
  }
}

export interface LLMRequest {
  systemPrompt: string
  userMessage: string
  data?: any
}

export interface LLMResponse {
  content: string
}

const DEFAULT_CONFIG: TOONConfig = {
  eligibility: {
    minTabularPercent: 60,
    maxNestedDepth: 4,
    minUniformityScore: 0.8
  }
}

export function encodeToTOON(data: any): string {
  return toonEncode(data)
}

export function decodeFromTOON(toonData: string): any {
  return toonDecode(toonData)
}

export function countTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function calculateTokenSavings(jsonData: any): TokenMetrics {
  const jsonString = JSON.stringify(jsonData)
  const toonString = encodeToTOON(jsonData)
  
  const original = countTokens(jsonString)
  const toon = countTokens(toonString)
  const savings = original - toon
  const percentSaved = original > 0 ? (savings / original) * 100 : 0
  
  return { original, toon, savings, percentSaved }
}

export function analyzeEligibility(data: any): EligibilityAnalysis {
  const stats = analyzeDataStructure(data)
  
  const shouldUseTOON = 
    stats.percentTabular >= DEFAULT_CONFIG.eligibility.minTabularPercent &&
    stats.nestedDepth <= DEFAULT_CONFIG.eligibility.maxNestedDepth &&
    stats.uniformityScore >= DEFAULT_CONFIG.eligibility.minUniformityScore
  
  const reasons: string[] = []
  
  if (stats.percentTabular >= 80) {
    reasons.push('highly tabular data (ideal for TOON)')
  } else if (stats.percentTabular >= 60) {
    reasons.push('moderately tabular data (good fit for TOON)')
  } else {
    reasons.push(`only ${stats.percentTabular}% tabular (TOON less beneficial)`)
  }
  
  if (stats.nestedDepth > DEFAULT_CONFIG.eligibility.maxNestedDepth) {
    reasons.push(`deep nesting (${stats.nestedDepth} levels)`)
  }
  
  if (stats.uniformityScore < DEFAULT_CONFIG.eligibility.minUniformityScore) {
    reasons.push(`low uniformity score (${stats.uniformityScore.toFixed(2)})`)
  }
  
  return {
    percentTabular: stats.percentTabular,
    nestedDepth: stats.nestedDepth,
    uniformityScore: stats.uniformityScore,
    shouldUseTOON,
    reason: reasons.join('; ')
  }
}

function analyzeDataStructure(data: any): {
  percentTabular: number
  nestedDepth: number
  uniformityScore: number
} {
  let totalArrays = 0
  let tabularArrays = 0
  let maxDepth = 0
  let uniformitySum = 0
  let uniformityCount = 0
  
  function traverse(obj: any, depth: number = 0): void {
    maxDepth = Math.max(maxDepth, depth)
    
    if (Array.isArray(obj)) {
      totalArrays++
      
      if (obj.length > 0 && isUniformObjectArray(obj)) {
        tabularArrays++
        uniformitySum += calculateUniformity(obj)
        uniformityCount++
      }
      
      obj.forEach((item: any) => traverse(item, depth + 1))
    } else if (obj !== null && typeof obj === 'object') {
      Object.values(obj).forEach((value: any) => traverse(value, depth + 1))
    }
  }
  
  traverse(data)
  
  const percentTabular = totalArrays > 0 ? (tabularArrays / totalArrays) * 100 : 0
  const uniformityScore = uniformityCount > 0 ? uniformitySum / uniformityCount : 1
  
  return {
    percentTabular,
    nestedDepth: maxDepth,
    uniformityScore
  }
}

function isUniformObjectArray(arr: any[]): boolean {
  if (arr.length === 0) return false
  if (!arr.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) {
    return false
  }
  
  const firstKeys = new Set(Object.keys(arr[0]))
  return arr.every(item => {
    const keys = Object.keys(item)
    return keys.length === firstKeys.size && keys.every(k => firstKeys.has(k))
  })
}

function calculateUniformity(arr: any[]): number {
  if (arr.length === 0) return 1
  
  const referenceFields = Object.keys(arr[0])
  const totalFields = referenceFields.length * arr.length
  let presentFields = 0
  
  arr.forEach(obj => {
    referenceFields.forEach(field => {
      if (field in obj) presentFields++
    })
  })
  
  return presentFields / totalFields
}

export function preProcessRequest(request: LLMRequest): {
  request: LLMRequest & { toonProcessed: boolean; metrics?: TokenMetrics }
  eligibility: EligibilityAnalysis
} {
  if (!request.data) {
    return {
      request: { ...request, toonProcessed: false },
      eligibility: { percentTabular: 0, nestedDepth: 0, uniformityScore: 0, shouldUseTOON: false, reason: 'no data' }
    }
  }
  
  const eligibility = analyzeEligibility(request.data)
  
  if (!eligibility.shouldUseTOON) {
    return {
      request: { ...request, toonProcessed: false },
      eligibility
    }
  }
  
  const metrics = calculateTokenSavings(request.data)
  const toonData = encodeToTOON(request.data)
  
  return {
    request: {
      ...request,
      data: toonData,
      toonProcessed: true,
      metrics
    },
    eligibility
  }
}

function addTOONInstructions(prompt: string): string {
  return `${prompt}

## Data Format

Structured data is provided in TOON (Token-Oriented Object Notation) format:
\`\`\`toon
arrayName[N]{field1,field2,field3}:
  value1,value2,value3
  value4,value5,value6
\`\`\`

Use TOON format for all structured data responses.
`
}

export function postProcessResponse(response: LLMResponse): {
  parsed?: any
  success: boolean
  format: 'toon' | 'json' | 'none'
  error?: string
} {
  if (!response.content) {
    return { success: false, format: 'none' }
  }
  
  const trimmed = response.content.trim()
  
  if (!isTOONFormat(trimmed)) {
    return { success: false, format: 'none' }
  }
  
  try {
    const parsed = decodeFromTOON(trimmed)
    return { parsed, success: true, format: 'toon' }
  } catch (toonError) {
    try {
      const parsed = JSON.parse(response.content)
      return {
        parsed,
        success: true,
        format: 'json',
        error: 'TOON decode failed, fell back to JSON'
      }
    } catch {
      return {
        success: false,
        format: 'none',
        error: 'Both formats failed'
      }
    }
  }
}

function isTOONFormat(text: string): boolean {
  return /\[\d+\]/.test(text) && /\{[^}]+\}/.test(text)
}

export class TOONProcessor {
  private config: TOONConfig
  
  constructor(config?: Partial<TOONConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  preProcess(request: LLMRequest): {
    request: LLMRequest & { toonProcessed: boolean; metrics?: TokenMetrics }
    eligibility: EligibilityAnalysis
  } {
    if (!request.data) {
      return {
        request: { ...request, toonProcessed: false },
        eligibility: { percentTabular: 0, nestedDepth: 0, uniformityScore: 0, shouldUseTOON: false, reason: 'no data' }
      }
    }
    
    const eligibility = analyzeEligibility(request.data)
    
    if (!eligibility.shouldUseTOON) {
      return {
        request: { ...request, toonProcessed: false },
        eligibility
      }
    }
    
    const metrics = calculateTokenSavings(request.data)
    const toonData = encodeToTOON(request.data)
    
    return {
      request: {
        ...request,
        data: toonData,
        toonProcessed: true,
        metrics
      },
      eligibility
    }
  }
  
  postProcess(response: LLMResponse): {
    parsed?: any
    success: boolean
    format: 'toon' | 'json' | 'none'
    error?: string
  } {
    if (!response.content) {
      return { success: false, format: 'none' }
    }
    
    const trimmed = response.content.trim()
    
    if (!isTOONFormat(trimmed)) {
      return { success: false, format: 'none' }
    }
    
    try {
      const parsed = decodeFromTOON(trimmed)
      return { parsed, success: true, format: 'toon' }
    } catch {
      try {
        const parsed = JSON.parse(response.content)
        return { parsed, success: true, format: 'json', error: 'TOON decode failed, fell back to JSON' }
      } catch {
        return { success: false, format: 'none', error: 'Both formats failed' }
      }
    }
  }
  
  getConfig(): TOONConfig {
    return this.config
  }
  
  updateConfig(config: Partial<TOONConfig>): void {
    this.config = { ...this.config, ...config }
  }
}