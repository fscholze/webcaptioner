import { useCallback } from 'react'

const DEFAULT_SPEED = 1
const MIN_SPEED = 1
const MAX_SPEED = 2

const BUFFER_FULL_SECONDS       = 8
const BUFFER_HIGH_SECONDS       = 14
const BUFFER_CRITICAL_SECONDS   = 20
const BUFFER_EMERGENCY_SECONDS  = 30
const BUFFER_APOCALYPSE_SECONDS = 45

const WORDS_PER_MINUTE = 150

const clampSpeed = (speed: number) => {
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed))
}

export const estimateSpeechDurationSeconds = (text: string) => {
  const cleaned = text.trim()

  if (!cleaned) return 0

  const words = cleaned.split(/\s+/).filter(Boolean).length
  const wordBasedSeconds = (words / WORDS_PER_MINUTE) * 60

  return Math.max(0.6, wordBasedSeconds)
}

type CalculateAdaptiveSpeedArgs = {
  bufferedSeconds: number
}

export const useAdaptiveTtsSpeed = () => {
  const calculateAdaptiveSpeed = useCallback(
    ({ bufferedSeconds }: CalculateAdaptiveSpeedArgs) => {
      // Normalfall: immer natürliche Geschwindigkeit
      if (bufferedSeconds < BUFFER_FULL_SECONDS) {
        return DEFAULT_SPEED
      }

      // Ausnahmefall: so viel audio, dass Aufholen erzwungen wird, auf Kosten der Verständlichkeit
      if (bufferedSeconds >= BUFFER_APOCALYPSE_SECONDS) {
        return clampSpeed(2)
      }
      
      // Ausnahmefall: so viel audio, dass Verständlichkeit gerade noch so gegeben, aber Aufholen dringend nötig
      if (bufferedSeconds >= BUFFER_EMERGENCY_SECONDS) {
        return clampSpeed(1.5)
      }

      // Ausnahmefall: es liegt wirklich hörbar viel Audio im Buffer, wir sollten uns etwas sputen
      if (bufferedSeconds >= BUFFER_CRITICAL_SECONDS) {
        return clampSpeed(1.25)
      }

      // es hat sich delay aufgebaut, was aber noch durch Sprecherpausen kompensierbar wäre
      if (bufferedSeconds >= BUFFER_HIGH_SECONDS) {
        return clampSpeed(1.15)
      }

      return clampSpeed(1.08)
    },
    [],
  )

  const resetAdaptiveSpeed = useCallback(() => {
    // aktuell kein State nötig
  }, [])

  return {
    calculateAdaptiveSpeed,
    resetAdaptiveSpeed,
  }
}
