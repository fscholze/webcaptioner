import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Settings } from '../../../types/settings'
import { handleSuccess } from '../components/audio-recorder/handler/handle-success'
import { initWebsocket } from '../components/audio-recorder/handler/init-websocket'
import { typedVoskResponse } from '../../../helper/vosk'
import { createYoutubePackages } from '../../../helper/vosk'
import {
  getTranslation,
  getParseDataForYoutube,
  getAudioFromText,
  createAudioRecord,
} from '../../../lib/server-manager'
import { localStorage } from '../../../lib/local-storage'
import dayjs from 'dayjs'
import { InputLine, TranslationResponse, YoutubeSettings } from '../types'
import { audioQueueService } from '../../../services/AudioQueueService'
import {
  InputWord,
  normalizeTranscriptText,
  normalizeTranscriptKey,
} from '../../../types/transcript'
import { VoskSendConfigService } from '../../../lib/vosk-config-service'
import {
  useAdaptiveTtsSpeed,
  estimateSpeechDurationSeconds,
} from '../../../hooks/useAdaptiveTtsSpeed'
import {
  attachTokensToLatestTranslation,
  dequeuePendingTranslationTokens,
  enqueuePendingTranslationTokens,
} from '../../../helper/translation-token-sync'
import { reducePartialText } from '../../../helper/partial-transcript'
import { FRONTEND_WEBCAPTIONER_SERVER } from "../../../config";

const shouldIgnoreTranscriptionText = (plainText: string): boolean => {
  const t = plainText.trim()
  if (!t) return true

  let hasAlphaNum = false

  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i]

    if (ch >= '0' && ch <= '9') {
      hasAlphaNum = true
      break
    }

    // Rough but robust "is letter" check that works for Latin-extended
    // without requiring unicode property escapes.
    if (ch.toLowerCase() !== ch.toUpperCase()) {
      hasAlphaNum = true
      break
    }
  }

  if (!hasAlphaNum) return true

  return false
}

type AudioQueueServiceWithBufferSeconds = typeof audioQueueService & {
  getBufferedSeconds?: () => number
}

export const useRecording = (
  settings: Settings,
  selectedMicrophone: MediaDeviceInfo | null,
  options: {
    youtubeSettings: YoutubeSettings
    timeOffsetRef: React.RefObject<number>
    setInputText: (cb: (prev: InputLine[]) => InputLine[]) => void
    setTranslation: (
      cb: (prev: TranslationResponse[]) => TranslationResponse[],
    ) => void
    audioContext: {
      playAudioData: (data: ArrayBuffer) => Promise<void>
    } | null
  },
  audioRecordId: string | undefined,
) => {
  const [isRecording, setIsRecording] = useState(false)
  const [voskResponse, setVoskResponse] = useState(false)
  const [partialText, setPartialText] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isVoskBuilding, setIsVoskBuilding] = useState(false)

  let processor: AudioWorkletNode
  let source: MediaStreamAudioSourceNode
  let context: AudioContext

  const seqRef = useRef<number>(0)
  const pendingAudioSecondsRef = useRef(0)

  const voskReadyRef = useRef<boolean>(false)
  const voskConfigSentRef = useRef<boolean>(false)
  const voskStreamStartedRef = useRef<boolean>(false)

  const { calculateAdaptiveSpeed, resetAdaptiveSpeed } = useAdaptiveTtsSpeed()

  // Replace local variable with a ref to persist the websocket
  const webSocketRef = useRef<WebSocket | null>(null)

  const translationsWsRef = useRef<WebSocket | null>(null)
  const translationsWsRecordIdRef = useRef<string | null>(null)
  const partialTextRef = useRef('')
  const acceptPartialsRef = useRef(true)

  const broadcastPartialToCast = (partial: string) => {
    const ws = translationsWsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ partial }))
    }
  }

  const clearPartialText = (options?: { lockPartials?: boolean }) => {
    if (options?.lockPartials) {
      acceptPartialsRef.current = false
    }

    if (partialTextRef.current === '') return
    partialTextRef.current = ''
    setPartialText('')
    broadcastPartialToCast('')
  }

  const applyPartialUpdate = (incoming: string | undefined) => {
    if (!acceptPartialsRef.current) return
    const next = reducePartialText(partialTextRef.current, incoming)
    if (next === partialTextRef.current) return
    partialTextRef.current = next
    setPartialText(next)
    broadcastPartialToCast(next)
  }

  const pendingTranslationTokensRef = useRef<Map<string, InputWord[][]>>(
    new Map(),
  )

  useEffect(() => {
    const key = options.youtubeSettings.streamingKey

    if (key) {
      seqRef.current = localStorage.getCounterForYoutubeStreaming(key)
    } else {
      seqRef.current = 0
    }
  }, [options.youtubeSettings.streamingKey])

  // Initialize the audio service when the hook mounts, only if audioContext is provided
  useEffect(() => {
    if (options.audioContext) {
      audioQueueService.initialize(options.audioContext)
    }
  }, [options.audioContext])

  const getBufferedAudioSeconds = () => {
    const queueService = audioQueueService as AudioQueueServiceWithBufferSeconds

    if (typeof queueService.getBufferedSeconds !== 'function') {
      return 0
    }

    return queueService.getBufferedSeconds()
  }

  const attachTranslationTokensToLatest = (
    translation: string,
    translationTokens: InputWord[],
  ) => {
    if (!translation || !translationTokens?.length) return

    options.setTranslation(prev => {
      const result = attachTokensToLatestTranslation(
        prev,
        translation,
        translationTokens,
      )

      if (!result.attached) {
        enqueuePendingTranslationTokens(
          pendingTranslationTokensRef.current,
          translation,
          translationTokens,
        )

        return prev
      }

      return result.translations
    })
  }

  const flushQueuedTokensForTranslation = (translation: string) => {
    const queuedTokens = dequeuePendingTranslationTokens(
      pendingTranslationTokensRef.current,
      translation,
    )

    if (queuedTokens?.length) {
      attachTranslationTokensToLatest(translation, queuedTokens)
    }
  }

  const maybeSendYoutubePackages = async (
    seq: number,
    text: string,
    timing: { start: Date; stop: Date },
  ) => {
    const streamingKey = options.youtubeSettings.streamingKey
    if (!streamingKey) return

    const youtubePackages = createYoutubePackages(text, timing)

    for (const youtubePackage of youtubePackages) {
      const youtubeData = await getParseDataForYoutube(
        seq,
        youtubePackage.text,
        dayjs(youtubePackage.date)
          .add(options.timeOffsetRef.current ?? 0, 'seconds')
          .toDate(),
        streamingKey,
      )

      if (youtubeData.errorMessage) {
        console.error(youtubeData.errorMessage)
        toast.error(youtubeData.errorMessage)
      }

      options.setTranslation(prev =>
        prev.map(p =>
          p.text === youtubeData.text
            ? {
                ...p,
                text: youtubeData.text,
                timestamp: youtubeData.timestamp,
                successfull: youtubeData.successfull,
                counter: youtubeData.seq,
                timestampDiff:
                  (new Date().getTime() -
                    new Date(youtubeData.timestamp).getTime()) /
                  1000,
              }
            : p,
        ),
      )
    }
  }

  const playTranslationAudio = (translation: string, speakerId: string) => {
    const estimatedAudioSeconds = estimateSpeechDurationSeconds(translation)

    const bufferedSeconds =
      getBufferedAudioSeconds() + pendingAudioSecondsRef.current

    const speed = calculateAdaptiveSpeed({
      bufferedSeconds,
    })

    pendingAudioSecondsRef.current += estimatedAudioSeconds

    getAudioFromText(translation, speakerId, speed)
      .then(audioResponse => {
        audioQueueService.addToQueue(audioResponse.data, estimatedAudioSeconds)
      })
      .catch(error => {
        console.error('Error playing audio:', error)
      })
      .finally(() => {
        pendingAudioSecondsRef.current = Math.max(
          0,
          pendingAudioSecondsRef.current - estimatedAudioSeconds,
        )
      })
  }

  const onReceiveMessage = async (
    event: MessageEvent,
    recordId: string | undefined,
  ) => {
    if (event.data) {
      if (typeof event.data === 'string') {
        try {
          const maybeReady = JSON.parse(event.data) as any

          if (maybeReady?.type === 'vosk_ready') {
            voskReadyRef.current = true
            setIsVoskBuilding(false)

            if (!voskConfigSentRef.current) {
              voskConfigSentRef.current = true

              VoskSendConfigService.sendConfig(
                webSocketRef.current,
                settings.sampleRate,
                settings.chunkLength,
              )
            }

            if (!voskStreamStartedRef.current) {
              voskStreamStartedRef.current = true
              startRecordingWithNewStream()
            }

            return
          }
        } catch {
          // ignore non-JSON payloads
        }
      }

      const parsed = typedVoskResponse(event.data)

      // Fallback: if we receive any normal Vosk payload, we are effectively "ready".
      setIsVoskBuilding(false)

      setVoskResponse(parsed.listen)

      if (parsed.listen) {
        acceptPartialsRef.current = true
      }

      if (parsed.text) {
        clearPartialText({ lockPartials: true })

        const streamingKey = options.youtubeSettings.streamingKey

        if (streamingKey) {
          seqRef.current += 1

          localStorage.setCounterForYoutubeStreaming(
            streamingKey,
            seqRef.current,
          )
        }

        const tokens = (parsed.result ?? []).filter(w => !!w?.word?.trim())
        const plainFromText = normalizeTranscriptText(parsed.text)

        const plainText = tokens.length
          ? tokens.map(w => w.word).join(' ')
          : plainFromText

        if (plainText.length <= 0) return
        if (shouldIgnoreTranscriptionText(plainText)) return

        const timing = {
          start: parsed.start ? new Date(parsed.start) : new Date(),
          stop: parsed.stop ? new Date(parsed.stop) : new Date(),
        }

        options.setInputText(prev => [...prev, { plain: plainText, tokens }])

        const targetLanguage =
          settings.sotraModel === 'libretranslate'
            ? settings.libretranslateTargetLanguage
            : settings.translationTargetLanguage

        getTranslation(
          recordId,
          plainText,
          settings.sotraModel,
          'hsb',
          targetLanguage,
        ).then(async response => {
          const payload = response.data
          const translation = payload.translation
          const translationTokens = Array.isArray(payload.translationTokens)
            ? payload.translationTokens
            : undefined

          // Only play audio if autoPlayAudio is enabled AND audioContext is provided
          if (settings.autoPlayAudio && options.audioContext) {
            if (payload.playBeep) {
              audioQueueService.addBeepToQueue(0.2)
            } else {
              playTranslationAudio(translation, settings.selectedSpeakerId)
            }
          }

          // Save the translation
          options.setTranslation(prev => {
            const normalized = normalizeTranscriptKey(translation)
            const last = prev[prev.length - 1]

            if (last && normalizeTranscriptKey(last.text) === normalized) {
              return prev
            }

            return [
              ...prev,
              {
                text: translation,
                ...(translationTokens?.length ? { translationTokens } : {}),
              },
            ]
          })

          clearPartialText()

          // If tokens arrived before the state update, attach them now.
          flushQueuedTokensForTranslation(translation)

          await maybeSendYoutubePackages(seqRef.current, translation, timing)
        })
      } else if (parsed.partial !== undefined) {
        applyPartialUpdate(parsed.partial)
      }
    }
  }

  const onStopRecording = () => {
    clearPartialText({ lockPartials: true })
    setIsVoskBuilding(false)
    resetAdaptiveSpeed()
    pendingAudioSecondsRef.current = 0

    voskReadyRef.current = false
    voskConfigSentRef.current = false
    voskStreamStartedRef.current = false

    VoskSendConfigService.sendEOF(webSocketRef.current)
    webSocketRef.current?.close()

    translationsWsRef.current?.close()
    translationsWsRef.current = null
    translationsWsRecordIdRef.current = null
    pendingTranslationTokensRef.current.clear()

    processor?.port.close()
    source?.disconnect(processor)
    context?.close()

    if (stream?.active) {
      stream.getTracks().forEach(track => track.stop())
    }

    setIsRecording(false)
  }

  const startRecordingWithNewStream = () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          ...settings,
          deviceId: selectedMicrophone?.deviceId,
        },
        video: false,
      })
      .then(stream => {
        setStream(stream)
        setIsRecording(true)

        if (stream !== null) {
          handleSuccess(
            stream,
            settings.sampleRate,
            webSocketRef.current!,
            settings.chunkLength,
            (p: AudioWorkletNode) => {
              processor = p
            },
            (s: MediaStreamAudioSourceNode) => {
              source = s
            },
            (c: AudioContext) => {
              context = c
            },
            onStopRecording,
          )
        }
      })
      .catch(error => {
        setIsVoskBuilding(false)
        onStopRecording()

        toast.error(
          `Error accessing microphone ${selectedMicrophone?.label}`,
          error.message,
        )
      })
  }

  const startRecording = async (
    handleRecordCreated: (id: string, token: string) => void,
    oldRecordId?: string,
  ) => {
    try {
      setIsVoskBuilding(true)
      resetAdaptiveSpeed()
      pendingAudioSecondsRef.current = 0

      voskReadyRef.current = false
      voskConfigSentRef.current = false
      voskStreamStartedRef.current = false

      let recordId = oldRecordId

      if (!recordId) {
        // Create audio record first with current autoPlayAudio settings
        const response = await createAudioRecord(
          settings.autoPlayAudio,
          settings.selectedSpeakerId,
        )

        recordId = response.data._id
        const token = response.data.token

        // Notify parent component about the new record
        handleRecordCreated(recordId, token)
      }

      webSocketRef.current = initWebsocket(
        `${FRONTEND_WEBCAPTIONER_SERVER!}/vosk?recordId=${recordId}`,
        e => onReceiveMessage(e, recordId),
      )

      // Subscribe to translations websocket too (provides translationTokens with conf)
      // so main screen can render confidence coloring and [unverständlich] masking.
      if (recordId && translationsWsRecordIdRef.current !== recordId) {
        try {
          translationsWsRef.current?.close()
        } catch {
          // ignore
        }

        translationsWsRecordIdRef.current = recordId

        const wsUrl = `${FRONTEND_WEBCAPTIONER_SERVER?.replace(
          'http',
          'ws',
        )}/translations?recordId=${recordId}`

        translationsWsRef.current = initWebsocket(
          wsUrl,
          (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data as string)

              if (typeof data?.partial === 'string') {
                return
              }

              const translation =
                typeof data?.translation === 'string' ? data.translation : ''

              const translationTokens = Array.isArray(data?.translationTokens)
                ? (data.translationTokens as InputWord[])
                : undefined

              if (!translation || !translationTokens?.length) return

              attachTranslationTokensToLatest(translation, translationTokens)
            } catch (error) {
              console.error('[translations/ws][main] parse error', error)
            }
          },
        )

        translationsWsRef.current.addEventListener('open', () => {
          if (partialTextRef.current) {
            broadcastPartialToCast(partialTextRef.current)
          }
        })
      }

      webSocketRef.current.onerror = () => {
        toast('Connection error. Please try again.')
        setIsVoskBuilding(false)
        breakRecording('stop')
      }
    } catch (error) {
      toast.error('Error creating audio record')
      setIsVoskBuilding(false)
      console.error('Error creating audio record:', error)
    }
  }

  const breakRecording = (newState: 'stop' | 'pause') => {
    console.log('breakRecording', newState)

    if (isRecording) {
      onStopRecording()
    }
  }

  return {
    isRecording,
    isVoskBuilding,
    voskResponse,
    partialText,
    stream,
    setVoskResponse,
    startRecording,
    breakRecording,
    onReceiveMessage,
  }
}
