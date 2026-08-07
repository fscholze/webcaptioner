import { Settings } from '../types/settings'
import {
  TRANSLATION_TARGET_LANGUAGES,
  TranslationTargetLanguage,
} from '../constants/translation'
import { DEFAULT_LIBRETRANSLATE_TARGET_LANGUAGE } from './libretranslate'
import { FRONTEND_DEFAULT_VOSK_SAMPLE_RATE,FRONTEND_DEFAULT_AUDIO_FORMAT,FRONTEND_DEFAULT_TRANSLATION_TARGET_LANGUAGE,FRONTEND_DEFAULT_SOTRA_MODEL } from "../config";

export const DEFAULT_SPEAKER_ID = 'weronika'
export const DEFAULT_SAMPLE_RATE = FRONTEND_DEFAULT_VOSK_SAMPLE_RATE
  ? parseInt(FRONTEND_DEFAULT_VOSK_SAMPLE_RATE)
  : 48000
export const DEFAULT_AUDIO_FORMAT =
  FRONTEND_DEFAULT_AUDIO_FORMAT || 'mp3'
const DEFAULT_FALLBACK_TRANSLATION_TARGET_LANGUAGE = 'de'

function isTranslationTargetLanguage(
  value: string,
): value is TranslationTargetLanguage {
  return TRANSLATION_TARGET_LANGUAGES.includes(
    value as TranslationTargetLanguage,
  )
}

function parseTranslationTargetLanguageOrDefault(
  value: string | undefined,
): TranslationTargetLanguage {
  if (!value) {
    console.warn(
      `Missing FRONTEND_DEFAULT_TRANSLATION_TARGET_LANGUAGE. ` +
        `Using default "${DEFAULT_FALLBACK_TRANSLATION_TARGET_LANGUAGE}".`,
    )

    return DEFAULT_FALLBACK_TRANSLATION_TARGET_LANGUAGE
  }

  if (!isTranslationTargetLanguage(value)) {
    console.warn(
      `Invalid FRONTEND_DEFAULT_TRANSLATION_TARGET_LANGUAGE: "${value}". ` +
        `Allowed values are: ${TRANSLATION_TARGET_LANGUAGES.join(', ')}. ` +
        `Using default "${DEFAULT_FALLBACK_TRANSLATION_TARGET_LANGUAGE}".`,
    )

    return DEFAULT_FALLBACK_TRANSLATION_TARGET_LANGUAGE
  }

  return value
}

export const DEFAULT_TRANSLATION_TARGET_LANGUAGE =
  parseTranslationTargetLanguageOrDefault(
    FRONTEND_DEFAULT_TRANSLATION_TARGET_LANGUAGE,
  )

export const DEFAULT_SETTINGS: Settings = {
  autoGainControl: false,
  noiseSuppression: false,
  echoCancellation: false,
  channelCount: 1,
  sampleRate: DEFAULT_SAMPLE_RATE,
  sampleSize: 16,
  deviceId: undefined,
  chunkLength: 4096,
  sotraModel: FRONTEND_DEFAULT_SOTRA_MODEL as SotraModel,
  autoPlayAudio: false,
  selectedSpeakerId: DEFAULT_SPEAKER_ID,
  translationTargetLanguage: DEFAULT_TRANSLATION_TARGET_LANGUAGE,
  libretranslateTargetLanguage: DEFAULT_LIBRETRANSLATE_TARGET_LANGUAGE,
} as const
