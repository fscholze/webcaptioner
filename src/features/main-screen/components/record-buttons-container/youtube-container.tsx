import { Clear } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Input,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { FC, useEffect, useState } from 'react'
import { localStorage } from '../../../../lib/local-storage'
import { SettingsPopupContainer } from './settings-popup-container'
import { SettingsRow } from './settings-row'

export type YoutubeSettings = {
  streamingKey?: string
  timeOffset: number
  counter: number
}

type TempYoutubeSettings = {
  streamingKey: string
  timeOffset: number | ''
  counter: number | ''
}

export const YoutubeContainer: FC<{
  anchorEl: null | HTMLElement
  open: boolean
  disabled: boolean
  onClose: () => void
  settings: YoutubeSettings
  onSave: (settings: YoutubeSettings) => void
}> = ({ anchorEl, open, disabled, onClose, settings, onSave }) => {
  const [fetchingCounterIsLoading, setFetchingCounterIsLoading] =
    useState(false)

  const [tempSettings, setTempSettings] = useState<TempYoutubeSettings>({
    streamingKey: settings.streamingKey ?? '',
    timeOffset: settings.timeOffset,
    counter: settings.counter,
  })

  useEffect(() => {
    if (!open) return

    setTempSettings({
      streamingKey: settings.streamingKey ?? '',
      timeOffset: settings.timeOffset,
      counter: settings.counter,
    })
  }, [settings, open])

  useEffect(() => {
    if (!open) return

    setFetchingCounterIsLoading(true)

    const timeoutId = window.setTimeout(() => {
      const counter = tempSettings.streamingKey
        ? localStorage.getCounterForYoutubeStreaming(tempSettings.streamingKey)
        : 0

      setTempSettings(prev => ({
        ...prev,
        counter,
      }))

      setFetchingCounterIsLoading(false)
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
      setFetchingCounterIsLoading(false)
    }
  }, [tempSettings.streamingKey, open])

  const handleNumberChange =
    (field: 'counter' | 'timeOffset') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value

      setTempSettings(prev => ({
        ...prev,
        [field]: value === '' ? '' : Number(value),
      }))
    }

  const handleSave = () => {
    onSave({
      streamingKey: tempSettings.streamingKey || undefined,
      counter: tempSettings.counter === '' ? 0 : tempSettings.counter,
      timeOffset: tempSettings.timeOffset === '' ? 0 : tempSettings.timeOffset,
    })
  }

  return (
    <SettingsPopupContainer
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      width={600}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: '100%',
          minWidth: 0,
        }}
      >
        <Box sx={{ width: '100%', minWidth: 0 }}>
          <Typography variant='body1' gutterBottom>
            Youtube Streamschlüssel:
          </Typography>

          <TextField
            placeholder='1234-5678-9012-3456'
            value={tempSettings.streamingKey}
            fullWidth
            disabled={disabled}
            onChange={event =>
              setTempSettings(prev => ({
                ...prev,
                streamingKey: event.target.value,
              }))
            }
            slotProps={{
              input: {
                endAdornment: Boolean(tempSettings.streamingKey) && (
                  <InputAdornment position='end'>
                    <IconButton
                      edge='end'
                      disabled={disabled}
                      aria-label='Streamschlüssel löschen'
                      onClick={() =>
                        setTempSettings(prev => ({
                          ...prev,
                          streamingKey: '',
                        }))
                      }
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <SettingsRow label='Counter:'>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
            }}
          >
            <Input
              size='small'
              type='number'
              disabled={disabled || fetchingCounterIsLoading}
              value={tempSettings.counter}
              title='Counter'
              onChange={handleNumberChange('counter')}
              sx={{
                width: {
                  xs: 72,
                  sm: 90,
                },
                maxWidth: '100%',
                '& input': {
                  textAlign: 'right',
                },
              }}
            />

            {fetchingCounterIsLoading && <CircularProgress size={15} />}
          </Box>
        </SettingsRow>

        <SettingsRow label='Časowy offset (s):'>
          <Input
            size='small'
            type='number'
            disabled={disabled}
            value={tempSettings.timeOffset}
            title='Časowy offset (s)'
            onChange={handleNumberChange('timeOffset')}
            sx={{
              width: {
                xs: 72,
                sm: 90,
              },
              maxWidth: '100%',
              '& input': {
                textAlign: 'right',
              },
            }}
          />
        </SettingsRow>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Button disabled={disabled} onClick={handleSave}>
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </Box>
      </Box>
    </SettingsPopupContainer>
  )
}
