const isAuthenticated = () =>
  window.localStorage.getItem('isAuthenticated') === 'true'

const setIsAuthenticated = () =>
  window.localStorage.setItem('isAuthenticated', 'true')

const getAccessToken = () => window.localStorage.getItem('accessToken')

const setAccessToken = (value: string) =>
  window.localStorage.setItem('accessToken', value)

const getRefreshToken = () => window.localStorage.getItem('refreshToken')

const setRefreshToken = (value: string) =>
  window.localStorage.setItem('refreshToken', value)

const getIdToken = () => window.localStorage.getItem('idToken')

const setIdToken = (value: string) =>
  window.localStorage.setItem('idToken', value)

const getCounterForYoutubeStreaming = (streamingKey: string) => {
  const value = window.localStorage.getItem(`counter-${streamingKey}`)
  return value ? parseInt(value) : 0
}

const setCounterForYoutubeStreaming = (streamingKey: string, counter: number) =>
  window.localStorage.setItem(`counter-${streamingKey}`, counter.toString())

const deleteAll = () => {
  window.localStorage.removeItem('isAuthenticated')
  window.localStorage.removeItem('accessToken')
  window.localStorage.removeItem('refreshToken')
  window.localStorage.removeItem('idToken')
}

export const localStorage = {
  isAuthenticated,
  setIsAuthenticated,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getIdToken,
  setIdToken,
  deleteAll,
  getCounterForYoutubeStreaming,
  setCounterForYoutubeStreaming,
}
