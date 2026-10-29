import { createContext, useEffect, useState, useCallback } from 'react'
import type { FC, ReactNode } from 'react'
import { localStorage } from '../lib/local-storage'
import { axiosInstance } from '../lib/axios'
import { createCodeChallenge, createRandomString } from '../lib/pkce'

const KEYCLOAK_AUTH_KEY = 'keycloakAuth'

interface State {
  isAuthenticated: boolean
  isInitialized: boolean
  user: User | null
}

interface AuthContextValue extends State {
  login: (email: string, password: string) => Promise<void>
  loginFree: (password: string) => Promise<void>
  startKeycloakLogin: () => Promise<void>
  completeKeycloakLogin: (code: string, state: string) => Promise<void>
  logout: () => void
}

interface AuthProviderProps {
  children: ReactNode
}

const initialState: State = {
  isAuthenticated: false,
  isInitialized: false,
  user: null,
}

const AuthContext = createContext<AuthContextValue>({
  ...initialState,
  login: () => Promise.resolve(),
  loginFree: () => Promise.resolve(),
  startKeycloakLogin: () => Promise.resolve(),
  completeKeycloakLogin: () => Promise.resolve(),
  logout: () => {},
})

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.isAuthenticated(),
  )
  const [isInitialized, setIsInitialized] = useState(false)
  const [user, setUser] = useState(initialState.user)

  const getMe = useCallback(async () => {
    try {
      const response = await axiosInstance.get('auth/me')
      const { _id, email, firstname, lastname, role } = response.data
      setIsAuthenticated(true)
      setUser({ _id, email, firstname, lastname, role, audioRecords: [] })
      return true
    } catch {
      setIsAuthenticated(false)
      setUser(null)
      localStorage.deleteAll()
      return false
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      if (localStorage.getAccessToken()) {
        await getMe()
      }
      setIsInitialized(true)
    }

    init()
  }, [getMe])

  const storeSession = (
    token: string,
    refreshToken?: string,
    idToken?: string,
  ) => {
    localStorage.setAccessToken(token)
    if (refreshToken) {
      localStorage.setRefreshToken(refreshToken)
    }
    if (idToken) {
      localStorage.setIdToken(idToken)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await axiosInstance.post('/auth/login', {
      email,
      password,
    })
    localStorage.setAccessToken(response.data.token)
    await getMe()
  }

  const startKeycloakLogin = async () => {
    const { data } = await axiosInstance.get('/auth/keycloak/config')
    if (!data.enabled) {
      throw new Error('Keycloak is not configured')
    }

    const codeVerifier = createRandomString()
    const codeChallenge = await createCodeChallenge(codeVerifier)
    const state = createRandomString()
    const redirectUri = `${window.location.origin}/authentication/callback`

    window.sessionStorage.setItem(
      KEYCLOAK_AUTH_KEY,
      JSON.stringify({ state, codeVerifier, redirectUri }),
    )

    const params = new URLSearchParams({
      client_id: data.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: data.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    window.location.assign(`${data.authorizationEndpoint}?${params}`)
  }

  const completeKeycloakLogin = useCallback(
    async (code: string, state: string) => {
      const raw = window.sessionStorage.getItem(KEYCLOAK_AUTH_KEY)
      if (!raw) {
        throw new Error('Missing login session')
      }

      const stored = JSON.parse(raw) as {
        state: string
        codeVerifier: string
        redirectUri: string
      }

      if (stored.state !== state) {
        throw new Error('Invalid login state')
      }

      try {
        const response = await axiosInstance.post('/auth/keycloak/callback', {
          code,
          redirectUri: stored.redirectUri,
          codeVerifier: stored.codeVerifier,
        })

        window.sessionStorage.removeItem(KEYCLOAK_AUTH_KEY)
        const { token, refreshToken, idToken } = response.data
        storeSession(token, refreshToken, idToken)
        const authenticated = await getMe()
        if (!authenticated) {
          throw new Error('Not authenticated')
        }
      } catch (error) {
        window.sessionStorage.removeItem(KEYCLOAK_AUTH_KEY)
        localStorage.deleteAll()
        setIsAuthenticated(false)
        setUser(null)
        throw error
      }
    },
    [getMe],
  )

  const loginFree = (password: string) => {
    return axiosInstance.post('/auth/loginFree', { password }).then(() => {
      localStorage.setIsAuthenticated()
      setIsAuthenticated(true)
    })
  }

  const logout = () => {
    const idToken = localStorage.getIdToken()
    const redirectUri = `${window.location.origin}/authentication/login`
    setIsAuthenticated(false)
    setUser(null)
    localStorage.deleteAll()

    if (!idToken) return

    axiosInstance
      .get('/auth/keycloak/config')
      .then(({ data }) => {
        if (!data.enabled) return
        const params = new URLSearchParams({
          client_id: data.clientId,
          post_logout_redirect_uri: redirectUri,
          id_token_hint: idToken,
        })
        window.location.assign(`${data.logoutEndpoint}?${params}`)
      })
      .catch(() => {})
  }

  if (!isInitialized) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitialized,
        user,
        login,
        loginFree,
        startKeycloakLogin,
        completeKeycloakLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
