export type InputWord = {
  word: string
  conf: number
  spell?: boolean
  start?: number
  end?: number
}

export type InputLine = {
  plain: string
  tokens?: InputWord[]
}

export type TranscriptLine = string | InputLine

export const normalizeTranscriptText = (text: unknown): string => {
  if (typeof text !== 'string') return ''
  const trimmed = text.trim()
  const dequoted = trimmed
    .replace(/^"+/, '')
    .replace(/"+$/, '')
    .replace(/^'+/, '')
    .replace(/'+$/, '')
    .trim()
  return dequoted
}

export const normalizeTranscriptKey = (text: unknown): string => {
  const normalized = normalizeTranscriptText(text)
  return normalized.replace(/\s+/g, ' ').toLowerCase()
}

const TRANSLATION_TEXT_KEYS = [
  'translation',
  'marked_translation',
  'translatedText',
  'translated_text',
  'text',
  'plain',
  'output',
  'output_html',
] as const

export const extractTranslationText = (value: unknown, depth = 0): string => {
  if (depth > 5 || value == null) return ''

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) return ''
    return trimmed
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map(item => extractTranslationText(item, depth + 1))
      .filter(Boolean)
      .join(' ')
      .trim()
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of TRANSLATION_TEXT_KEYS) {
      if (record[key] == null) continue
      const extracted = extractTranslationText(record[key], depth + 1)
      if (extracted) return extracted
    }
  }

  return ''
}

export const createTranscriptLine = (
  text: unknown,
  ...tokenSources: unknown[]
): TranscriptLine => {
  const plain = extractTranslationText(text)

  for (const tokenSource of tokenSources) {
    const tokens = normalizeInputWords(tokenSource)
    if (tokens?.length) {
      return { plain, tokens }
    }
  }

  return plain
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const normalizeSpell = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value === 'true'
  return undefined
}

const normalizeNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : undefined
}

const normalizeInputWords = (raw: unknown): InputWord[] | undefined => {
  if (!Array.isArray(raw)) return undefined
  const tokens = raw
    .map((t): InputWord | null => {
      if (!isRecord(t)) return null
      const word = typeof t.word === 'string' ? t.word : String(t.word ?? '')
      const conf = normalizeNumber(t.conf)
      if (!word.trim() || conf === undefined) return null

      return {
        word,
        conf,
        spell: normalizeSpell(t.spell),
        start: normalizeNumber(t.start),
        end: normalizeNumber(t.end),
      }
    })
    .filter((t): t is InputWord => Boolean(t))

  return tokens.length ? tokens : undefined
}

export const isInputLine = (value: unknown): value is InputLine => {
  if (!isRecord(value)) return false
  const plain = value.plain
  const text = value.text
  return typeof plain === 'string' || typeof text === 'string'
}
//TODO: optimize

export const getTranscriptLinePlain = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (!isRecord(value)) return ''

  if (typeof value.plain === 'string') return value.plain
  if (typeof value.text === 'string') return value.text

  const tokens = normalizeInputWords(
    value.tokens ?? value.result ?? value.words,
  )
  if (tokens?.length) return tokens.map(t => t.word).join(' ')
  return ''
}

export const getTranscriptLineTokens = (
  value: unknown,
): InputWord[] | undefined => {
  if (typeof value === 'string') return undefined
  if (!isRecord(value)) return undefined
  return normalizeInputWords(value.tokens ?? value.result ?? value.words)
}
