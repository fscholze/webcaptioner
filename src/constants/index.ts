export * from './audio'
export const MAX_TEXT_LINES = process.env.REACT_APP_MAX_LINES_IN_HISTORY
  ? parseInt(process.env.REACT_APP_MAX_LINES_IN_HISTORY)
  : 10
export const APP_VERSION = '2.0.0'
