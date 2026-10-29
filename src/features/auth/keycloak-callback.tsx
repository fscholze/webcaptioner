import { FC, useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material'
import axios from 'axios'
import useAuth from '../../hooks/use-auth'
import { storeKeycloakLoginError } from '../../lib/keycloak-login-error'

const fallbackError = 'Přizjewjenje njeje so poradźiło'

const readLoginError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return { message: fallbackError, logoutUrl: undefined }
  }

  const data = error.response?.data as
    | { message?: unknown; logoutUrl?: unknown }
    | undefined
  const message =
    typeof data?.message === 'string' && data.message.trim()
      ? data.message
      : fallbackError
  const logoutUrl =
    typeof data?.logoutUrl === 'string' ? data.logoutUrl : undefined

  return { message, logoutUrl }
}

const loginAttempts = new Map<string, Promise<void>>()

const KeycloakCallback: FC = () => {
  const { completeKeycloakLogin } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [logoutUrl, setLogoutUrl] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError || !code || !state) {
      setError(fallbackError)
      return
    }

    let attempt = loginAttempts.get(code)
    if (!attempt) {
      attempt = completeKeycloakLogin(code, state)
      loginAttempts.set(code, attempt)
    }

    attempt.catch((loginError: unknown) => {
      loginAttempts.delete(code)
      if (!active) return
      const result = readLoginError(loginError)
      if (result.logoutUrl) {
        storeKeycloakLoginError(result.message)
        window.location.replace(result.logoutUrl)
        return
      }
      setLogoutUrl(result.logoutUrl)
      setError(result.message)
    })

    return () => {
      active = false
    }
  }, [completeKeycloakLogin])

  return (
    <Container maxWidth='xs'>
      <Box
        sx={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {error ? (
          <>
            <Typography sx={{ color: 'var(--text-primary)' }}>{error}</Typography>
            <Button
              color='primary'
              fullWidth
              size='large'
              variant='contained'
              onClick={() => {
                window.location.assign(
                  logoutUrl ?? '/authentication/login-with-email',
                )
              }}
            >
              Znowa spytać
            </Button>
          </>
        ) : (
          <CircularProgress />
        )}
      </Box>
    </Container>
  )
}

export default KeycloakCallback
