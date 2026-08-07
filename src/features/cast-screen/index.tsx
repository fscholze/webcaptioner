import { useCallback, useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Container } from '@mui/material'
import { initWebsocket } from '../main-screen/components/audio-recorder/handler/init-websocket'
import {
  getAudioFromText,
  getAudioRecord,
  getCastRecord,
} from '../../lib/server-manager'
import { audioQueueService } from '../../services/AudioQueueService'
import {
  AutoscrollToggle,
  TokenInputForm,
  FullscreenTextDisplay,
  TextFieldWithControls,
  DraggableDivider,
  AudioToggle,
} from './components'
import ThemeToggle from '../../components/theme-toggle'
import { useWakeLock } from '../../hooks/use-wakelock'
import {
  createTranscriptLine,
  getTranscriptLineTokens,
} from '../../types/transcript'
import {
  useAdaptiveTtsSpeed,
  estimateSpeechDurationSeconds,
} from '../../hooks/useAdaptiveTtsSpeed'
import { isTranslationTooWrong } from '../../helper/translation-quality'
import { reducePartialText } from '../../helper/partial-transcript'
import { FRONTEND_WEBCAPTIONER_SERVER } from "../../config";

const CastScreen = () => {
  const { token: urlToken } = useParams<{ token: string }>()
  const navigate = useNavigate()

  useWakeLock()

  const pendingAudioSecondsRef = useRef(0)
  const [cast, setCast] = useState<AudioRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputToken, setInputToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [originalFontSize, setOriginalFontSize] = useState(() => {
    const saved = localStorage.getItem('castScreenOriginalFontSize')
    return saved ? parseInt(saved, 10) : 16
  })

  const [translatedFontSize, setTranslatedFontSize] = useState(() => {
    const saved = localStorage.getItem('castScreenTranslatedFontSize')
    return saved ? parseInt(saved, 10) : 16
  })

  const [autoscroll, setAutoscroll] = useState(() => {
    const saved = localStorage.getItem('castScreenAutoscroll')
    return saved ? JSON.parse(saved) : true
  })

  const [audioEnabled, setAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('castScreenAudioEnabled')
    return saved ? JSON.parse(saved) : false
  })

  const [textFieldSize, setTextFieldSize] = useState(() => {
    const saved = localStorage.getItem('castScreenTextFieldSize')
    return saved ? parseInt(saved, 10) : 50
  })

  const [isDragging, setIsDragging] = useState(false)
  const [partialText, setPartialText] = useState('')

  const [fullscreenField, setFullscreenField] = useState<
    'none' | 'original' | 'translated'
  >('none')

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const castRef = useRef<AudioRecord | null>(null)
  const audioEnabledRef = useRef<boolean>(false)

  const { calculateAdaptiveSpeed, resetAdaptiveSpeed } = useAdaptiveTtsSpeed()

  useEffect(() => {
    localStorage.setItem(
      'castScreenOriginalFontSize',
      originalFontSize.toString(),
    )
  }, [originalFontSize])

  useEffect(() => {
    localStorage.setItem(
      'castScreenTranslatedFontSize',
      translatedFontSize.toString(),
    )
  }, [translatedFontSize])

  useEffect(() => {
    localStorage.setItem('castScreenAutoscroll', JSON.stringify(autoscroll))
  }, [autoscroll])

  useEffect(() => {
    localStorage.setItem('castScreenAudioEnabled', JSON.stringify(audioEnabled))
  }, [audioEnabled])

  useEffect(() => {
    localStorage.setItem('castScreenTextFieldSize', textFieldSize.toString())
  }, [textFieldSize])

  // Disable background scrollbar while fullscreen is active
  useEffect(() => {
    const isFullscreen = fullscreenField !== 'none'

    document.body.style.overflow = isFullscreen ? 'hidden' : 'auto'
    document.documentElement.style.overflow = isFullscreen ? 'hidden' : 'auto'

    return () => {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }
  }, [fullscreenField])

  // Refetch audio record when audio state changes to ensure synchronization
  useEffect(() => {
    if (cast?._id && audioEnabled) {
      // When audio is enabled, check if it's actually available on the server
      getAudioRecord(cast._id)
        .then(response => {
          const updatedCast = response.data
          if (updatedCast.speakerId === null && audioEnabled) {
            // If server shows audio is disabled, update local state
            setAudioEnabled(false)
            setCast(updatedCast)
          }
        })
        .catch(error => {
          console.error('Error checking audio availability:', error)
        })
    }
  }, [audioEnabled, cast?._id])

  // Debounced refetch to avoid too many API calls
  useEffect(() => {
    if (!cast?._id) return

    const timeoutId = setTimeout(async () => {
      try {
        const response = await getAudioRecord(cast._id)
        const updatedCast = response.data

        // Only update if there are actual changes
        if (updatedCast.speakerId !== cast.speakerId) {
          setCast(updatedCast)

          // If audio is disabled on the main screen (speakerId is null), disable it on cast screen
          if (updatedCast.speakerId === null && audioEnabled) {
            setAudioEnabled(false)
          }
        }
      } catch (error) {
        console.error('Error in debounced audio record refetch:', error)
      }
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [cast?._id, cast?.speakerId, audioEnabled])

  // Initialize audio context and AudioQueueService
  useEffect(() => {
    if (!audioContextRef.current) {
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )()
      audioContextRef.current = audioContext

      // Create wrapper with playAudioData method
      const audioContextWrapper = {
        playAudioData: async (data: ArrayBuffer) => {
          try {
            // Resume audio context if it's suspended (browser autoplay policy)
            if (audioContext.state === 'suspended') {
              await audioContext.resume()
            }

            const audioBuffer = await audioContext.decodeAudioData(data)
            const source = audioContext.createBufferSource()

            source.buffer = audioBuffer
            source.connect(audioContext.destination)

            return new Promise<void>(resolve => {
              source.onended = () => {
                resolve()
              }

              source.start()
            })
          } catch (error) {
            console.error('Error playing audio:', error)
            throw error
          }
        },

        playBeep: async (options?: {
          frequencyHz?: number
          durationMs?: number
          volume?: number
        }) => {
          try {
            if (audioContext.state === 'suspended') {
              await audioContext.resume()
            }

            const frequencyHz = options?.frequencyHz ?? 660
            const durationMs = options?.durationMs ?? 180
            const volume = options?.volume ?? 0.14

            const now = audioContext.currentTime
            const durationSeconds = Math.max(0.02, durationMs / 1000)

            const oscillator = audioContext.createOscillator()
            const gain = audioContext.createGain()

            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(frequencyHz, now)

            gain.gain.setValueAtTime(0, now)
            gain.gain.linearRampToValueAtTime(volume, now + 0.01)
            gain.gain.linearRampToValueAtTime(0, now + durationSeconds)

            oscillator.connect(gain)
            gain.connect(audioContext.destination)

            return new Promise<void>(resolve => {
              oscillator.onended = () => resolve()
              oscillator.start(now)
              oscillator.stop(now + durationSeconds)
            })
          } catch (error) {
            console.error('Error playing beep:', error)
          }
        },
      }

      audioQueueService.initialize(audioContextWrapper)
    }
  }, [])

  // Update refs when state changes
  useEffect(() => {
    castRef.current = cast
  }, [cast])

  useEffect(() => {
    audioEnabledRef.current = audioEnabled
  }, [audioEnabled])

  // Automatically disable audio if cast settings don't allow it
  useEffect(() => {
    if (cast?.speakerId === null) {
      setAudioEnabled(false)
    }
  }, [cast?.speakerId])

  // Poll for audio setting changes from the main screen
  useEffect(() => {
    if (!cast?._id) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await getAudioRecord(cast._id)
        const updatedCast = response.data

        // Check if audio settings have changed
        if (updatedCast.speakerId !== cast.speakerId) {
          setCast(updatedCast)

          // If audio is disabled on the main screen (speakerId is null), disable it on cast screen
          if (updatedCast.speakerId === null && audioEnabled) {
            setAudioEnabled(false)
          }
        }
      } catch (error) {
        console.error('Error polling for audio record updates:', error)
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(pollInterval)
  }, [cast?._id, cast?.speakerId, audioEnabled])

  useEffect(() => {
    if (!autoscroll) return

    // Scroll both text fields to bottom when new content arrives
    const originalTextContainer = document.querySelector(
      '[data-text-field="original"]',
    )

    const translatedTextContainer = document.querySelector(
      '[data-text-field="translated"]',
    )

    // If in fullscreen mode, scroll the fullscreen container instead
    if (fullscreenField === 'original' || fullscreenField === 'translated') {
      const fullscreenContainer = document.querySelector(
        '[data-fullscreen-content]',
      )

      if (fullscreenContainer) {
        fullscreenContainer.scrollTop = fullscreenContainer.scrollHeight
        return
      }
    }

    // Normal mode - scroll both containers
    if (originalTextContainer) {
      originalTextContainer.scrollTop = originalTextContainer.scrollHeight
    }

    if (translatedTextContainer) {
      translatedTextContainer.scrollTop = translatedTextContainer.scrollHeight
    }
  }, [
    cast?.originalText,
    cast?.translatedText,
    autoscroll,
    fullscreenField,
    partialText,
  ])

  const increaseOriginalFontSize = () => {
    setOriginalFontSize(prev => Math.min(128, prev + 2))
  }

  const decreaseOriginalFontSize = () => {
    setOriginalFontSize(prev => Math.max(12, prev - 2))
  }

  const increaseTranslatedFontSize = () => {
    setTranslatedFontSize(prev => Math.min(128, prev + 2))
  }

  const decreaseTranslatedFontSize = () => {
    setTranslatedFontSize(prev => Math.max(12, prev - 2))
  }

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()

    const startY = e.clientY
    const startTextFieldSize = textFieldSize
    const containerHeight = (70 * window.innerHeight) / 100

    setIsDragging(true)

    // Add visual feedback during dragging
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.body.classList.add('dragging')

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const deltaPercentage = (deltaY / containerHeight) * 100

      const newTextFieldSize = Math.max(
        10,
        Math.min(90, startTextFieldSize + deltaPercentage),
      )

      setTextFieldSize(newTextFieldSize)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.body.classList.remove('dragging')

      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDividerTouchStart = (event: React.TouchEvent) => {
    setIsDragging(true)

    const touch = event.touches[0]
    const startY = touch.clientY
    const startSize = textFieldSize

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentY = moveEvent.touches[0].clientY
      const deltaY = currentY - startY
      const windowHeight = window.innerHeight

      const newSize = Math.max(
        10,
        Math.min(90, startSize + (deltaY / windowHeight) * 100),
      )

      setTextFieldSize(newSize)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)

      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }

  const toggleFullscreen = (field: 'original' | 'translated') => {
    setFullscreenField(prev => (prev === field ? 'none' : field))
  }

  const validateToken = useCallback(
    async (tokenToValidate: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getCastRecord(tokenToValidate)

        setCast(response.data)
        resetAdaptiveSpeed()

        // Immediately refetch to ensure we have the latest audio settings
        if (response.data?._id) {
          try {
            const latestResponse = await getAudioRecord(response.data._id)
            setCast(latestResponse.data)
          } catch (error) {
            console.error('Error fetching latest audio record:', error)
          }
        }

        if (response.data?._id) {
          if (wsRef.current) {
            wsRef.current.close()
          }

          const wsUrl = `${FRONTEND_WEBCAPTIONER_SERVER?.replace(
            'http',
            'ws',
          )}/translations?recordId=${response.data._id}`

          wsRef.current = initWebsocket(wsUrl, (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data)

              if (data.original && data.translation) {
                setPartialText('')

                const originalLine = createTranscriptLine(
                  data.original,
                  data.originalTokens,
                )

                const translatedLine = createTranscriptLine(
                  data.translation,
                  data.translationTokens,
                )

                setCast(prevCast =>
                  prevCast
                    ? {
                        ...prevCast,
                        originalText: [...prevCast.originalText, originalLine],
                        translatedText: [
                          ...prevCast.translatedText,
                          translatedLine,
                        ],
                      }
                    : prevCast,
                )

                // Immediately refetch the audio record to get the latest settings
                if (castRef.current?._id) {
                  getAudioRecord(castRef.current._id)
                    .then(response => {
                      const updatedCast = response.data

                      if (
                        updatedCast.speakerId !== castRef.current?.speakerId
                      ) {
                        setCast(updatedCast)

                        // If audio is disabled on the main screen, disable it on cast screen
                        if (
                          updatedCast.speakerId === null &&
                          audioEnabledRef.current
                        ) {
                          setAudioEnabled(false)
                        }
                      }
                    })
                    .catch(error => {
                      console.error('Error refetching audio record:', error)
                    })
                }

                if (
                  audioEnabledRef.current &&
                  castRef.current?.speakerId !== null &&
                  castRef.current?.speakerId !== undefined
                ) {
                  const speakerId = castRef.current.speakerId.toString()

                  const translationTokens =
                    getTranscriptLineTokens(translatedLine)
                  if (data.playBeep || isTranslationTooWrong(translationTokens)) {
                    audioQueueService.addBeepToQueue(0.2)
                    return
                  }

                  const currentTextEstimatedSeconds =
                    estimateSpeechDurationSeconds(data.translation)

                  const bufferedSeconds =
                    typeof audioQueueService.getBufferedSeconds === 'function'
                      ? audioQueueService.getBufferedSeconds()
                      : 0

                  const speed = calculateAdaptiveSpeed({
                    bufferedSeconds:
                      bufferedSeconds + pendingAudioSecondsRef.current,
                  })

                  pendingAudioSecondsRef.current += currentTextEstimatedSeconds

                  getAudioFromText(data.translation, speakerId, speed)
                    .then(audioResponse => {
                      audioQueueService.addToQueue(
                        audioResponse.data,
                        currentTextEstimatedSeconds,
                      )
                    })
                    .catch(error => {
                      console.error('Error playing audio:', error)
                    })
                    .finally(() => {
                      pendingAudioSecondsRef.current = Math.max(
                        0,
                        pendingAudioSecondsRef.current -
                          currentTextEstimatedSeconds,
                      )
                    })
                }

                return
              }

              if (typeof data.partial === 'string') {
                if (data.partial === '') {
                  setPartialText('')
                  return
                }

                setPartialText(prev => reducePartialText(prev, data.partial))
              }
            } catch (e) {
              console.error('Invalid WS message', e)
            }
          })

          // Immediately refetch audio record after websocket connection to get latest settings
          try {
            const latestResponse = await getAudioRecord(response.data._id)
            setCast(latestResponse.data)
          } catch (error) {
            console.error(
              'Error fetching latest audio record after websocket connection:',
              error,
            )
          }
        }

        if (!urlToken) {
          navigate(`/cast/${tokenToValidate}`)
        }
      } catch (err) {
        setError('Njepłaćiwe token. Prošu přepruwuj swoje zapodaće.')
        console.error('Error validating token:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [navigate, urlToken, calculateAdaptiveSpeed, resetAdaptiveSpeed],
  )

  useEffect(() => {
    if (urlToken) {
      validateToken(urlToken)
    }
  }, [urlToken, validateToken])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (inputToken.trim()) {
      validateToken(inputToken.trim())
    }
  }

  const handleUserInteraction = () => {
    // Resume audio context on user interaction (required for autoplay)
    if (
      audioContextRef.current &&
      audioContextRef.current.state === 'suspended'
    ) {
      audioContextRef.current.resume()
    }
  }

  if (!urlToken) {
    return (
      <TokenInputForm
        inputToken={inputToken}
        setInputToken={setInputToken}
        error={error}
        isLoading={isLoading}
        onSubmit={handleSubmit}
      />
    )
  }

  if (error) {
    return (
      <Container maxWidth='xs'>
        <Typography color='error' sx={{ textAlign: 'center' }}>
          {error}
        </Typography>
      </Container>
    )
  }

  if (!cast) {
    return (
      <Container maxWidth='xs'>
        <Typography sx={{ color: 'var(--text-primary)', textAlign: 'center' }}>
          Loading...
        </Typography>
      </Container>
    )
  }

  return (
    <Container
      maxWidth={false}
      sx={{
        width: '95%',
        maxWidth: 'none',
        margin: '0 auto',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <ThemeToggle />

        <AudioToggle
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
          disabled={cast.speakerId === null}
          disabledByMainScreen={cast.speakerId === null}
          onToggle={handleUserInteraction}
        />

        <AutoscrollToggle
          autoscroll={autoscroll}
          setAutoscroll={setAutoscroll}
        />
      </Box>

      {/* Audio status message */}
      {cast.speakerId === null && (
        <Box
          sx={{
            position: 'absolute',
            top: 60,
            right: 0,
            zIndex: 10,
            padding: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 1,
            fontSize: '0.75rem',
            color: '#666',
          }}
        >
          Awdijo přez hłownu wobrazowku deaktiwěrowane
        </Box>
      )}

      <FullscreenTextDisplay
        fullscreenField={fullscreenField}
        setFullscreenField={setFullscreenField}
        originalText={cast.originalText}
        translatedText={cast.translatedText}
        originalPartialText={partialText}
        originalFontSize={originalFontSize}
        translatedFontSize={translatedFontSize}
        onIncreaseFontSize={
          fullscreenField === 'original'
            ? increaseOriginalFontSize
            : increaseTranslatedFontSize
        }
        onDecreaseFontSize={
          fullscreenField === 'original'
            ? decreaseOriginalFontSize
            : decreaseTranslatedFontSize
        }
      />

      {/* Vertical Text Fields with Draggable Divider */}
      <Box
        sx={{
          height: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Original Text Field */}
        <TextFieldWithControls
          title='Originalny tekst'
          texts={cast.originalText}
          translatedTexts={cast.translatedText}
          partialText={partialText}
          fontSize={originalFontSize}
          onIncreaseFontSize={increaseOriginalFontSize}
          onDecreaseFontSize={decreaseOriginalFontSize}
          onToggleFullscreen={() => toggleFullscreen('original')}
          isFullscreen={fullscreenField === 'original'}
          dataTextField='original'
          height={textFieldSize}
        />

        <DraggableDivider
          onMouseDown={handleDividerMouseDown}
          onTouchStart={handleDividerTouchStart}
          isDragging={isDragging}
          textFieldSize={textFieldSize}
        />

        {/* Translated Text Field */}
        <TextFieldWithControls
          title='Přełožk'
          texts={cast.translatedText}
          fontSize={translatedFontSize}
          onIncreaseFontSize={increaseTranslatedFontSize}
          onDecreaseFontSize={decreaseTranslatedFontSize}
          onToggleFullscreen={() => toggleFullscreen('translated')}
          isFullscreen={fullscreenField === 'translated'}
          dataTextField='translated'
          height={100 - textFieldSize}
          isTranslation
        />
      </Box>
    </Container>
  )
}

export default CastScreen
