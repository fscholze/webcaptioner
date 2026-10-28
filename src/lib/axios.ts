import axios from 'axios'
import { localStorage } from './local-storage'
import { FRONTEND_WEBCAPTIONER_SERVER } from "../config";

const BASE_URL = `${FRONTEND_WEBCAPTIONER_SERVER}`

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
})

axiosInstance.defaults.headers['Content-Type'] = 'application/json'

axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getAccessToken()

    if (token) {
      config.headers.Authorization = 'Bearer ' + token
    } else {
      delete config.headers.Authorization
    }

    return config
  },
  error => {
    Promise.reject(error)
  },
)

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    if (!originalRequest) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const url = originalRequest?.url ?? ''
    const isAuthAttempt =
      url.includes('/auth/keycloak/callback') ||
      url.includes('/auth/login') ||
      url.includes('/auth/refresh')
    const canRefresh =
      !isAuthAttempt &&
      (status === 401 || status === 403) &&
      !originalRequest._retry &&
      localStorage.getRefreshToken()

    if (canRefresh) {
      originalRequest._retry = true

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: localStorage.getRefreshToken(),
        })

        const { token, refreshToken, idToken } = response.data
        localStorage.setAccessToken(token)
        localStorage.setRefreshToken(refreshToken)
        if (idToken) {
          localStorage.setIdToken(idToken)
        }
        originalRequest.headers.Authorization = 'Bearer ' + token

        return axiosInstance(originalRequest)
      } catch {
        localStorage.deleteAll()
      }
    } else if (
      !isAuthAttempt &&
      status === 401 &&
      !originalRequest._retry
    ) {
      localStorage.deleteAll()
    }

    return Promise.reject(error)
  },
)
