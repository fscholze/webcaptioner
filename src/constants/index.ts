import { FRONTEND_MAX_LINES_IN_HISTORY } from "../config";

export * from './audio'
export const MAX_TEXT_LINES = FRONTEND_MAX_LINES_IN_HISTORY
  ? parseInt(FRONTEND_MAX_LINES_IN_HISTORY)
  : 10
export const APP_VERSION = '2.2.0'
