import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DEFAULT_SETTINGS } from '../constants'
import type { Settings } from '../types/settings'
import type {
  InputLine,
  TranslationResponse,
} from '../features/main-screen/types'
import type { YoutubeSettings } from '../features/main-screen/types'
import { useRecording } from '../features/main-screen/hooks/useRecording'
import { FRONTEND_DEFAULT_YOUTUBE_TIME_OFFSET } from "../config";

type RecordRef = { id: string; token: string }

type RecordingSessionContextValue = {
  mediaStreamSettings: Settings
  setMediaStreamSettings: React.Dispatch<React.SetStateAction<Settings>>

  selectedMicrophone: MediaDeviceInfo | null
  setSelectedMicrophone: React.Dispatch<
    React.SetStateAction<MediaDeviceInfo | null>
  >

  inputText: InputLine[]
  setInputText: React.Dispatch<React.SetStateAction<InputLine[]>>

  translation: TranslationResponse[]
  setTranslation: React.Dispatch<React.SetStateAction<TranslationResponse[]>>

  record: RecordRef | null
  setRecord: React.Dispatch<React.SetStateAction<RecordRef | null>>

  youtubeSettings: YoutubeSettings
  setYoutubeSettings: React.Dispatch<React.SetStateAction<YoutubeSettings>>
  timeOffsetRef: React.MutableRefObject<number>

  totalTime: number
  setTotalTime: React.Dispatch<React.SetStateAction<number>>

  recording: ReturnType<typeof useRecording>
}

const RecordingSessionContext =
  createContext<RecordingSessionContextValue | null>(null)

export const RecordingSessionProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [mediaStreamSettings, setMediaStreamSettings] =
    useState<Settings>(DEFAULT_SETTINGS)

  const [selectedMicrophone, setSelectedMicrophone] =
    useState<MediaDeviceInfo | null>(null)

  const [inputText, setInputText] = useState<InputLine[]>([])
  const [translation, setTranslation] = useState<TranslationResponse[]>([])

  const [record, setRecord] = useState<RecordRef | null>(null)

  const [totalTime, setTotalTime] = useState<number>(0)

  const [youtubeSettings, setYoutubeSettings] = useState<YoutubeSettings>({
    streamingKey: undefined,
    timeOffset: parseInt(
      FRONTEND_DEFAULT_YOUTUBE_TIME_OFFSET ?? '8',
    ),
    counter: 0,
  })

  const timeOffsetRef = useRef<number>(youtubeSettings.timeOffset)

  useEffect(() => {
    timeOffsetRef.current = youtubeSettings.timeOffset
  }, [youtubeSettings.timeOffset])

  const recording = useRecording(
    mediaStreamSettings,
    selectedMicrophone,
    {
      youtubeSettings,
      timeOffsetRef,
      setInputText,
      setTranslation,
      audioContext: null,
    },
    record?.id,
  )

  const timerIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (recording.isRecording) {
      if (timerIdRef.current === null) {
        timerIdRef.current = window.setInterval(() => {
          setTotalTime(prev => prev + 1)
        }, 1000)
      }
      return
    }

    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current)
      timerIdRef.current = null
    }
  }, [recording.isRecording])

  useEffect(() => {
    return () => {
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current)
        timerIdRef.current = null
      }
    }
  }, [])

  const value = useMemo<RecordingSessionContextValue>(
    () => ({
      mediaStreamSettings,
      setMediaStreamSettings,
      selectedMicrophone,
      setSelectedMicrophone,
      inputText,
      setInputText,
      translation,
      setTranslation,
      record,
      setRecord,
      youtubeSettings,
      setYoutubeSettings,
      timeOffsetRef,
      totalTime,
      setTotalTime,
      recording,
    }),
    [
      mediaStreamSettings,
      selectedMicrophone,
      inputText,
      translation,
      record,
      youtubeSettings,
      totalTime,
      recording,
    ],
  )

  return (
    <RecordingSessionContext.Provider value={value}>
      {children}
    </RecordingSessionContext.Provider>
  )
}

export const useRecordingSession = () => {
  const ctx = useContext(RecordingSessionContext)
  if (!ctx) {
    throw new Error(
      'useRecordingSession must be used within RecordingSessionProvider',
    )
  }
  return ctx
}
