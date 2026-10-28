import { FC, useEffect, useState } from 'react'
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material'
import useAuth from '../../hooks/use-auth'

const loginAttempts = new Map<string, Promise<void>>()

const KeycloakCallback: FC = () => {
  const { completeKeycloakLogin } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError || !code || !state) {
      setError('Přizjewjenje njeje so poradźiło')
      return
    }

    let attempt = loginAttempts.get(code)
    if (!attempt) {
      attempt = completeKeycloakLogin(code, state)
      loginAttempts.set(code, attempt)
    }

    attempt.catch(() => {
      loginAttempts.delete(code)
      if (active) setError('Přizjewjenje njeje so poradźiło')
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
              href='/authentication/login-with-email'
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
