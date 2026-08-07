import {
  Mic,
  Settings as SettingsIcon,
  Stop,
  YouTube,
  Share,
} from '@mui/icons-material'
import { Box, Button, IconButton, Typography } from '@mui/material'
import { FC, useMemo, useState } from 'react'
import { Visualizer } from 'react-sound-visualizer'
import { getDurationFromSeconds } from '../../../../helper/date-time-helper'
import { SettingsContainer } from './settings-container'
import { YoutubeContainer, YoutubeSettings } from './youtube-container'
import { Settings } from '../../../../types/settings'
import { useTheme } from '../../../../contexts/theme-context'
import { FRONTEND_RECORDING_INFORMATION_LINE } from "../../../../config";

export const RecordButtonsContainer: FC<{
  voskResponse: boolean
  stream: MediaStream | null
  isDisabled: { record: boolean; pause: boolean; stop: boolean }
  isRecording: boolean
  isQrCodeVisible: boolean
  settings: Settings
  onChangeSetting: (key: keyof Settings, value: any) => void
  totalTime: number
  setTotalTime: React.Dispatch<React.SetStateAction<number>>
  onPressRecord: () => void
  onPressPause: () => void
  onPressStop: () => void
  onChangeMicrophone: (mic: MediaDeviceInfo) => void
  activeMicrophone: MediaDeviceInfo | null
  youtubeSettings: YoutubeSettings
  onSaveYoutubeSettings: (settings: YoutubeSettings) => void
  speakers: BamborakSpeaker[]
  onShare: () => void
  record: { id: string; token: string } | null
}> = ({
  voskResponse,
  stream,
  isRecording,
  isDisabled,
  isQrCodeVisible,
  settings,
  onChangeSetting,
  totalTime,
  setTotalTime,
  onPressRecord,
  onPressPause,
  onPressStop,
  onChangeMicrophone,
  activeMicrophone,
  youtubeSettings,
  onSaveYoutubeSettings,
  speakers,
  onShare,
  record,
}) => {
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(
    null,
  )
  const { theme } = useTheme()

  const settingsOpen = Boolean(settingsAnchorEl)
  const handleSettingsOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSettingsAnchorEl(event.currentTarget)
  }
  const handleSettingsClose = () => {
    setSettingsAnchorEl(null)
  }

  const [youtubeAnchorEl, setYoutubeAnchorEl] = useState<null | HTMLElement>(
    null,
  )
  const youtubeOpen = Boolean(youtubeAnchorEl)
  const handleYoutubeOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setYoutubeAnchorEl(event.currentTarget)
  }
  const handleYoutubeClose = () => {
    setYoutubeAnchorEl(null)
  }

  const visualizerArea = useMemo(
    () => (
      <Visualizer
        audio={stream}
        mode='continuous'
        autoStart
        strokeColor={theme === 'dark' ? 'white' : 'black'}
      >
        {({ canvasRef }) => <canvas ref={canvasRef} height={100} />}
      </Visualizer>
    ),
    [stream, theme],
  )

  const settingsContainer = useMemo(
    () => (
      <SettingsContainer
        anchorEl={settingsAnchorEl}
        open={settingsOpen}
        disabled={isRecording}
        onClose={handleSettingsClose}
        settings={settings}
        onChangeSetting={onChangeSetting}
        onChangeMicrophone={onChangeMicrophone}
        activeMicrophone={activeMicrophone}
        speakers={speakers}
        record={record}
      />
    ),
    [
      activeMicrophone,
      isRecording,
      onChangeMicrophone,
      onChangeSetting,
      settings,
      settingsAnchorEl,
      settingsOpen,
      speakers,
      record,
    ],
  )

  const youtubeContainer = useMemo(
    () => (
      <YoutubeContainer
        anchorEl={youtubeAnchorEl}
        open={youtubeOpen}
        disabled={isRecording}
        onClose={handleYoutubeClose}
        settings={youtubeSettings}
        onSave={settings => {
          handleYoutubeClose()
          onSaveYoutubeSettings(settings)
        }}
      />
    ),
    [
      isRecording,
      onSaveYoutubeSettings,
      youtubeAnchorEl,
      youtubeOpen,
      youtubeSettings,
    ],
  )

  return (
    <Box
      sx={{
        backgroundColor: 'clear',
        borderRadius: 2,
        border: '2px var(--border-color) solid',
        minWidth: 300,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
          <Typography variant='body1'>
            {voskResponse ? '🟢' : '🔴'} Čas:{' '}
            {getDurationFromSeconds(totalTime)}
          </Typography>
        </Box>

        <Box>
          <IconButton sx={{ color: 'var(--text-primary)' }} onClick={onShare}>
            <Share />
          </IconButton>
          <IconButton
            sx={{ color: 'var(--text-primary)' }}
            onClick={handleYoutubeOpen}
          >
            <YouTube />
          </IconButton>
          <IconButton
            sx={{ color: 'var(--text-primary)' }}
            onClick={handleSettingsOpen}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>
      <Box
        sx={{
          borderTop: '2px var(--border-color) solid',
          height: 100,
        }}
      >
        {visualizerArea}
      </Box>
      <Typography variant='caption'>
        {FRONTEND_RECORDING_INFORMATION_LINE}
      </Typography>
      <Box>
        <Button
          onClick={onPressRecord}
          disabled={isDisabled.record}
          size='large'
          sx={{
            '&.Mui-disabled': {
              color: 'gray',
              borderColor: 'var(--border-color)',
            },
            color: 'var(--text-primary)',
            height: 40,
            borderColor: 'var(--border-color)',
            borderTop: '2px var(--border-color) solid',
            borderRight: '1px var(--border-color) solid',
            borderRadius: 0,
            width: '50%',
          }}
        >
          <Mic fontSize='small' />
          <Typography variant='body2'>Start</Typography>
        </Button>
        <Button
          onClick={() => {
            onPressStop()
            setTotalTime(0)
          }}
          disabled={isDisabled.stop}
          size='large'
          sx={{
            '&.Mui-disabled': {
              color: 'gray',
              borderColor: 'var(--border-color)',
            },
            color: 'var(--text-primary)',
            height: 40,
            borderColor: 'var(--border-color)',
            borderTop: '2px var(--border-color) solid',
            borderLeft: '1px var(--border-color) solid',
            borderRadius: 0,
            width: '50%',
          }}
        >
          <Stop fontSize='small' />
          <Typography variant='body2'>Stop</Typography>
        </Button>
      </Box>
      {settingsContainer}
      {youtubeContainer}
    </Box>
  )
}
