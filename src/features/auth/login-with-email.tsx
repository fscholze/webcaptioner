import { FC, useEffect, useState } from 'react'
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Button,
  Container,
  CircularProgress,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { toast } from 'sonner'
import useAuth from '../../hooks/use-auth'
import { axiosInstance } from '../../lib/axios'
import { consumeKeycloakLoginError } from '../../lib/keycloak-login-error'

const LoginWithEmailScreen: FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [keycloakEnabled, setKeycloakEnabled] = useState<boolean | null>(null)

  const { login, startKeycloakLogin } = useAuth()

  useEffect(() => {
    const message = consumeKeycloakLoginError()
    if (message) toast.error(message)
  }, [])

  useEffect(() => {
    axiosInstance
      .get('/auth/keycloak/config')
      .then(response => setKeycloakEnabled(Boolean(response.data.enabled)))
      .catch(() => setKeycloakEnabled(false))
  }, [])

  if (keycloakEnabled === null) {
    return (
      <Container maxWidth='xs'>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (keycloakEnabled) {
    return (
      <Container maxWidth='xs'>
        <Box sx={{ mt: 2 }}>
          <Button
            color='primary'
            fullWidth
            size='large'
            variant='contained'
            disabled={loading}
            onClick={() => {
              setLoading(true)
              startKeycloakLogin().catch(() => {
                toast.error('Přizjewjenje njeje so poradźiło')
                setLoading(false)
              })
            }}
          >
            Přizjewić
          </Button>
        </Box>
        <Box sx={{ mt: 1 }}>
          <Button
            sx={{ color: 'var(--text-primary)' }}
            fullWidth
            size='large'
            variant='text'
            href='/authentication/login'
          >
            Nimam account...
          </Button>
        </Box>
      </Container>
    )
  }

  const onLogin = () => {
    setLoading(true)
    login(email, password)
      .catch(() => {
        toast.error('Wopačna email abo tajne hesło')
      })
      .finally(() => setLoading(false))
  }

  return (
    <Container maxWidth='xs'>
      <Box
        component='form'
        onSubmit={e => {
          e.preventDefault()
          onLogin()
        }}
      >
        <TextField
          fullWidth
          label='email'
          margin='normal'
          autoComplete='email'
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          variant='filled'
          sx={{
            backgroundColor: 'var(--input-bg)',
            borderRadius: 2,
          }}
        />
        <TextField
          fullWidth
          label='tajne hesło'
          margin='normal'
          autoComplete='current-password'
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          variant='filled'
          sx={{
            backgroundColor: 'var(--input-bg)',
            borderRadius: 2,
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton
                  aria-label='toggle password visibility'
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={() => setShowPassword(!showPassword)}
                  edge='end'
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ mt: 2 }}>
          <Button
            color='primary'
            fullWidth
            size='large'
            type='submit'
            variant='contained'
            loading={loading}
          >
            Login
          </Button>
        </Box>
      </Box>

      <Box sx={{ mt: 1 }}>
        <Button
          sx={{ color: 'var(--text-primary)' }}
          fullWidth
          size='large'
          variant='text'
          href='/authentication/login'
        >
          Nimam account...
        </Button>
      </Box>
    </Container>
  )
}

export default LoginWithEmailScreen
