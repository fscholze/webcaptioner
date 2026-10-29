import { Box, Button } from '@mui/material'
import { Download } from '@mui/icons-material'
import { RecordButtonsContainer } from './record-buttons-container'
import { Settings } from '../../../types/settings'
import { TranslationResponse, YoutubeSettings } from '../types'
import { InputLine } from '../types'
import { download } from '../../../helper/download'
import { Typography } from '@mui/material'
import { MAX_TEXT_LINES } from '../../../constants'
import dayjs from 'dayjs'
import { QRCode } from './qr-code'
import { useState } from 'react'
import { createAudioRecord } from '../../../lib/server-manager'
import { SpellCheckedText } from '../../cast-screen/components/spell-checked-text'
import {
  createTranscriptLine,
  extractTranslationText,
} from '../../../types/transcript'
import { shouldShowPartialForDisplay, isRedundantPlainTranslationLine } from '../../../helper/partial-transcript'

const MAIN_SCREEN_FONT_SIZE = 16

type MainContentProps = {
  recording: {
    isRecording: boolean
    isVoskBuilding: boolean
    voskResponse: boolean
    partialText: string
    stream: MediaStream | null
    startRecording: (
      handleRecordCreated: (id: string, token: string) => void,
      oldRecordId?: string,
    ) => void
    breakRecording: (newState: 'stop' | 'pause') => void
  }
  selectedMicrophone: MediaDeviceInfo
  onChangeMicrophone: (mic: MediaDeviceInfo) => void
  settings: Settings
  onChangeSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void
  youtubeSettings: YoutubeSettings
  onChangeYoutubeSettings: (settings: YoutubeSettings) => void
  totalTime: number
  setTotalTime: React.Dispatch<React.SetStateAction<number>>
  inputText: InputLine[]
  translation: TranslationResponse[]
  speakers: BamborakSpeaker[]
  voskModels: VoskModel[]
  record: { id: string; token: string } | null
  setRecord: (record: { id: string; token: string }) => void
}

const asTranscriptLine = (value: unknown) => {
  const record =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : undefined

  return createTranscriptLine(
    extractTranslationText(value),
    record?.translationTokens,
    record?.tokens,
    record?.result,
    record?.words,
  )
}

export const MainContent = ({
  recording,
  selectedMicrophone,
  onChangeMicrophone,
  settings,
  onChangeSetting,
  youtubeSettings,
  onChangeYoutubeSettings,
  totalTime,
  setTotalTime,
  inputText,
  translation,
  speakers,
  voskModels,
  record,
  setRecord,
}: MainContentProps) => {
  const [showQrCode, setShowQrCode] = useState<boolean>(false)

  const handleShare = async () => {
    if (!showQrCode) {
      if (record) {
        setShowQrCode(true)
        return
      }
      // If we're showing the QR code for the first time, create a new record
      try {
        const response = await createAudioRecord(
          settings.autoPlayAudio,
          settings.selectedSpeakerId,
        )
        const newRecord = { id: response.data._id, token: response.data.token }
        setRecord(newRecord)
        setShowQrCode(true)
      } catch (error) {
        console.error('Error creating audio record:', error)
        // Still show QR code if there's an existing record
        if (record) {
          setShowQrCode(true)
        }
      }
    } else {
      // If QR code is already visible, hide it
      setShowQrCode(false)
    }
  }

  const visibleInputText = inputText.slice(-MAX_TEXT_LINES)
  const visibleTranslations = translation.slice(-MAX_TEXT_LINES)
  const lastOriginalPlain = visibleInputText[visibleInputText.length - 1]?.plain
  const lastTranslationText =
    visibleTranslations[visibleTranslations.length - 1]?.text
  const hasTranslationForLastOriginal =
    inputText.length > 0 && translation.length >= inputText.length
  const showOriginalPartial = shouldShowPartialForDisplay(
    recording.partialText,
    lastOriginalPlain,
    lastTranslationText,
    hasTranslationForLastOriginal,
  )

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <QRCode token={record?.token} show={showQrCode} />
      <RecordButtonsContainer
        voskResponse={recording.voskResponse}
        isDisabled={{
          record:
            recording.isRecording ||
            recording.isVoskBuilding ||
            !selectedMicrophone,
          pause: !recording.isRecording,
          stop: !recording.isRecording,
        }}
        isRecording={recording.isRecording}
        isQrCodeVisible={showQrCode}
        settings={settings}
        onChangeSetting={onChangeSetting}
        totalTime={totalTime}
        setTotalTime={setTotalTime}
        onPressRecord={() => {
          recording.startRecording((recordId, token) => {
            setRecord({ id: recordId, token })
          }, record?.id)
        }}
        onPressPause={() => recording.breakRecording('pause')}
        onPressStop={() => recording.breakRecording('stop')}
        onChangeMicrophone={onChangeMicrophone}
        activeMicrophone={selectedMicrophone}
        youtubeSettings={youtubeSettings}
        onSaveYoutubeSettings={onChangeYoutubeSettings}
        speakers={speakers}
        voskModels={voskModels}
        stream={recording.stream}
        onShare={handleShare}
        record={record}
      />

      <Box sx={{ padding: 2 }}>
        {visibleInputText.map((t, i) => (
          <SpellCheckedText
            key={i}
            line={t}
            fontSize={MAIN_SCREEN_FONT_SIZE}
            textColor='var(--text-primary)'
          />
        ))}
        {showOriginalPartial && (
          <SpellCheckedText
            line={recording.partialText}
            fontSize={MAIN_SCREEN_FONT_SIZE}
            textColor='var(--text-secondary)'
          />
        )}
        {!recording.isRecording && inputText.length > 0 && (
          <Button
            onClick={() =>
              download(
                inputText.map(t => t.plain),
                'original',
              )
            }
            startIcon={<Download />}
          >
            Download
          </Button>
        )}
      </Box>

      <div
        style={{
          height: 1,
          width: '80%',
          backgroundColor: 'var(--border-color)',
        }}
      />

      <Box sx={{ padding: 2 }}>
        {visibleTranslations.map((t, i, arr) => {
          if (isRedundantPlainTranslationLine(arr, i)) {
            return null
          }

          return (
          <Box key={i}>
            {t.counter && (
              <Typography>
                [{t.counter}]: {t.successfull ? '✅' : '❌'}{' '}
                {dayjs(t.timestamp).tz(dayjs.tz.guess()).format('HH:mm:ss:SSS')}{' '}
                <Typography
                  sx={{
                    display: 'inline',
                    color: !t.timestampDiff
                      ? 'var(--text-primary)'
                      : Math.abs(t.timestampDiff) < 20
                        ? '#4caf50'
                        : Math.abs(t.timestampDiff) < 40
                          ? '#ff9800'
                          : '#f44336',
                  }}
                >
                  {t.timestampDiff && t.timestampDiff > 0 ? '+' : ''}
                  {t.timestampDiff ?? 0}s
                </Typography>
              </Typography>
            )}
            <SpellCheckedText
              line={asTranscriptLine(t)}
              fontSize={MAIN_SCREEN_FONT_SIZE}
              isTranslation
              textColor='var(--text-primary)'
            />
          </Box>
          )
        })}
        {!recording.isRecording && translation.length > 0 && (
          <Button
            onClick={() =>
              download(
                translation.map(t => extractTranslationText(t)),
                'prelozk',
              )
            }
            startIcon={<Download />}
          >
            Download
          </Button>
        )}
      </Box>
    </Box>
  )
}
