import {
  Checkbox,
  Divider,
  Input,
  MenuItem,
  Select,
  Typography,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Box,
  Tooltip,
} from '@mui/material'
import { FC } from 'react'
import { MicrophoneSelector } from '../microphone-selector.tsx'
import {
  getTranslationTargetLanguageLabel,
  getSotraModelLabel,
  getLibreTranslateTargetLanguageLabel,
  getLibreTranslateTargetLanguageFlag,
} from '../../../../helper/text-parser'
import { Settings } from '../../../../types/settings'
import { updateAudioRecord } from '../../../../lib/server-manager'
import { TRANSLATION_TARGET_LANGUAGES } from '../../../../constants/translation'
import { LIBRETRANSLATE_TARGET_LANGUAGES } from '../../../../constants/libretranslate'
import { SettingsPopupContainer } from './settings-popup-container'
import { SettingsRow, SettingsFullWidthRow } from './settings-row'

const checkboxes: { key: keyof Settings; title: string }[] = [
  { key: 'autoGainControl', title: 'Auto Gain Control' },
  { key: 'noiseSuppression', title: 'Noise Suppression' },
  { key: 'echoCancellation', title: 'Echo Cancellation' },
]

const menuTextItems: {
  key: keyof Settings
  title: string
  editable: boolean
  options?: { title: string; value: string | number }[]
}[] = [
  { key: 'chunkLength', title: 'Buffer Size', editable: true },
  { key: 'channelCount', title: 'Channel Count', editable: false },
  {
    key: 'sampleRate',
    title: 'Sample Rate',
    editable: true,
    options: [
      { title: '8000', value: 8000 },
      { title: '16000', value: 16000 },
      { title: '48000', value: 48000 },
    ],
  },
  { key: 'sampleSize', title: 'Sample Size', editable: false },
  { key: 'deviceId', title: 'Device ID', editable: false },
]

const sotraModelOptions = [
  { title: getSotraModelLabel('ctranslate'), value: 'ctranslate' },
  { title: getSotraModelLabel('fairseq'), value: 'fairseq' },
  { title: getSotraModelLabel('libretranslate'), value: 'libretranslate' },
] as const

const LanguageMenuItem: FC<{ label: string; flag: string }> = ({
  label,
  flag,
}) => (
  <Box
    component='span'
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
    }}
  >
    <span aria-hidden='true'>{flag}</span>
    <span>{label}</span>
  </Box>
)

export const SettingsContainer: FC<{
  anchorEl: null | HTMLElement
  open: boolean
  disabled: boolean
  onClose: () => void
  settings: Settings
  onChangeSetting: (key: keyof Settings, value: any) => void
  onChangeMicrophone: (mic: MediaDeviceInfo) => void
  activeMicrophone: MediaDeviceInfo | null
  speakers: BamborakSpeaker[]
  voskModels: VoskModel[]
  record: { id: string; token: string } | null
}> = ({
  anchorEl,
  open,
  disabled,
  onClose,
  settings,
  onChangeSetting,
  onChangeMicrophone,
  activeMicrophone,
  speakers,
  voskModels,
  record,
}) => {
  const handleSpeakerChange = async (speakerId: string) => {
    onChangeSetting('selectedSpeakerId', speakerId)

    if (record?.id) {
      try {
        await updateAudioRecord(record.id, speakerId)
      } catch (error) {
        console.error('Error updating audio record with speakerId:', error)
      }
    }
  }

  const handleAutoPlayAudioChange = async (enabled: boolean) => {
    onChangeSetting('autoPlayAudio', enabled)

    if (record?.id) {
      try {
        if (enabled && settings.selectedSpeakerId) {
          await updateAudioRecord(record.id, settings.selectedSpeakerId)
        } else {
          await updateAudioRecord(record.id, null)
        }
      } catch (error) {
        console.error('Error updating audio record speakerId:', error)
      }
    }
  }

  const handleNumberChange = (key: keyof Settings, value: string) => {
    onChangeSetting(key, value === '' ? 0 : Number(value))
  }

  const handleVoskModelChange = (modelName: string) => {
    const model = voskModels.find(item => item.name === modelName)
    onChangeSetting('voskModel', modelName)
    if (model) {
      onChangeSetting('transcriptLanguage', model.transcriptLanguage)
    }
  }

  return (
    <SettingsPopupContainer
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      disableScrollLock
      width={420}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          width: '100%',
          minWidth: 0,
        }}
      >
        <Typography variant='body1' textAlign='right'>
          Nastajenja
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            width: '100%',
            minWidth: 0,
          }}
        >
          {checkboxes.map(({ key, title }) => {
            const setting = settings[key]
            const checked = typeof setting === 'boolean' ? setting : false

            return (
              <FormControlLabel
                key={key}
                disabled={disabled}
                control={
                  <Checkbox
                    checked={checked}
                    onChange={event =>
                      onChangeSetting(key, event.target.checked)
                    }
                  />
                }
                label={<Typography variant='body2'>{title}</Typography>}
                sx={{
                  m: 0,
                  minWidth: 0,
                }}
              />
            )
          })}
        </Box>

        <Divider />

        <Tooltip title='Twoje nahrawanja so internje za dalewuwiće spóz. rěče wužiwaja, so pak ženje njewozjewja.'>
          <span>
            <FormControlLabel
              disabled={disabled}
              control={
                <Checkbox
                  checked={settings.sendAudioLogging}
                  onChange={event =>
                    onChangeSetting('sendAudioLogging', event.target.checked)
                  }
                />
              }
              label={<Typography variant='body2'>Mój hłós spožčić</Typography>}
              sx={{
                m: 0,
                minWidth: 0,
              }}
            />
          </span>
        </Tooltip>

        {menuTextItems.map(({ key, title, editable, options }) => {
          const setting = settings[key]

          if (setting === undefined || typeof setting === 'boolean') {
            return null
          }

          if (options) {
            return (
              <SettingsRow key={key} label={`${title}:`}>
                {disabled ? (
                  <Typography variant='body2'>{String(setting)}</Typography>
                ) : (
                  <Select
                    size='small'
                    value={setting}
                    title={title}
                    onChange={event => onChangeSetting(key, event.target.value)}
                    sx={{
                      width: {
                        xs: 110,
                        sm: 140,
                      },
                      maxWidth: '100%',
                      textAlign: 'right',
                    }}
                  >
                    {options.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </SettingsRow>
            )
          }

          return (
            <SettingsRow key={key} label={`${title}:`}>
              {disabled || !editable ? (
                <Typography
                  variant='body2'
                  sx={{
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                  title={String(setting)}
                >
                  {String(setting)}
                </Typography>
              ) : (
                <Input
                  size='small'
                  type='number'
                  value={setting}
                  title={title}
                  onChange={event =>
                    handleNumberChange(key, event.target.value)
                  }
                  sx={{
                    width: {
                      xs: 80,
                      sm: 100,
                    },
                    maxWidth: '100%',
                    '& input': {
                      textAlign: 'right',
                    },
                  }}
                />
              )}
            </SettingsRow>
          )
        })}

        <SettingsRow label='Model:'>
          <Select
            size='small'
            disabled={disabled || voskModels.length === 0}
            value={
              voskModels.some(model => model.name === settings.voskModel)
                ? settings.voskModel
                : ''
            }
            displayEmpty
            title='Model'
            onChange={event =>
              handleVoskModelChange(String(event.target.value))
            }
            sx={{
              width: {
                xs: 150,
                sm: 190,
              },
              maxWidth: '100%',
              textAlign: 'right',
            }}
          >
            {voskModels.length === 0 && (
              <MenuItem value='' disabled>
                –
              </MenuItem>
            )}
            {voskModels.map(model => (
              <MenuItem key={model.name} value={model.name}>
                {model.description}
              </MenuItem>
            ))}
          </Select>
        </SettingsRow>

        <SettingsRow label='Sotra Model:'>
          <Select
            size='small'
            disabled={disabled}
            value={settings.sotraModel}
            title='Sotra Model'
            onChange={event =>
              onChangeSetting('sotraModel', event.target.value)
            }
            sx={{
              width: {
                xs: 150,
                sm: 190,
              },
              maxWidth: '100%',
              textAlign: 'right',
            }}
          >
            {sotraModelOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.title}
              </MenuItem>
            ))}
          </Select>
        </SettingsRow>

        {settings.sotraModel === 'libretranslate' ? (
          <SettingsRow label='Přełožowanska rěč:'>
            <Select
              size='small'
              disabled={disabled}
              value={settings.libretranslateTargetLanguage}
              title='Přełožowanska rěč'
              onChange={event =>
                onChangeSetting(
                  'libretranslateTargetLanguage',
                  event.target.value,
                )
              }
              renderValue={value => (
                <LanguageMenuItem
                  label={getLibreTranslateTargetLanguageLabel(
                    value as (typeof LIBRETRANSLATE_TARGET_LANGUAGES)[number],
                  )}
                  flag={getLibreTranslateTargetLanguageFlag(
                    value as (typeof LIBRETRANSLATE_TARGET_LANGUAGES)[number],
                  )}
                />
              )}
              sx={{
                width: {
                  xs: 150,
                  sm: 190,
                },
                maxWidth: '100%',
                textAlign: 'right',
              }}
            >
              {LIBRETRANSLATE_TARGET_LANGUAGES.map(lang => (
                <MenuItem key={lang} value={lang}>
                  <LanguageMenuItem
                    label={getLibreTranslateTargetLanguageLabel(lang)}
                    flag={getLibreTranslateTargetLanguageFlag(lang)}
                  />
                </MenuItem>
              ))}
            </Select>
          </SettingsRow>
        ) : (
          <SettingsRow label='Přełožowanska rěč:'>
            <Select
              size='small'
              disabled={disabled}
              value={settings.translationTargetLanguage}
              title='Přełožowanska rěč'
              onChange={event =>
                onChangeSetting('translationTargetLanguage', event.target.value)
              }
              sx={{
                width: {
                  xs: 150,
                  sm: 190,
                },
                maxWidth: '100%',
                textAlign: 'right',
              }}
            >
              {TRANSLATION_TARGET_LANGUAGES.map(lang => (
                <MenuItem key={lang} value={lang}>
                  {getTranslationTargetLanguageLabel(lang)}
                </MenuItem>
              ))}
            </Select>
          </SettingsRow>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={settings.autoPlayAudio}
              onChange={event =>
                handleAutoPlayAudioChange(event.target.checked)
              }
            />
          }
          disabled={disabled}
          label='Audio přełožk'
          sx={{
            m: 0,
            minWidth: 0,
          }}
        />

        {settings.autoPlayAudio && (
          <SettingsFullWidthRow>
            <FormControl
              margin='normal'
              sx={{
                backgroundColor: 'var(--input-bg)',
                borderRadius: 1,
                width: '100%',
                minWidth: 0,
              }}
              disabled={disabled}
            >
              <InputLabel>Rěčnik</InputLabel>

              <Select
                value={settings.selectedSpeakerId ?? ''}
                onChange={event => handleSpeakerChange(event.target.value)}
                label='Rěčnik'
                sx={{
                  width: '100%',
                  minWidth: 0,
                }}
              >
                {speakers.map(speaker => (
                  <MenuItem key={speaker.id} value={speaker.id}>
                    {speaker.name} - {speaker.language}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </SettingsFullWidthRow>
        )}

        <Divider />

        <SettingsFullWidthRow>
          <MicrophoneSelector
            activeMicrophone={activeMicrophone}
            onChange={onChangeMicrophone}
            fullWidth
          />
        </SettingsFullWidthRow>
      </Box>
    </SettingsPopupContainer>
  )
}
