import { FC, useEffect, useState } from 'react'
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Button,
  Container,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { toast } from 'sonner'
import useAuth from '../../hooks/use-auth'
import { consumeKeycloakLoginError } from '../../lib/keycloak-login-error'

const LoginScreen: FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { loginFree } = useAuth()

  const [password, setPassword] = useState('')

  useEffect(() => {
    const message = consumeKeycloakLoginError()
    if (message) toast.error(message)
  }, [])

  const onLogin = () => {
    loginFree(password).catch(() => toast.error('Wopačne tajne hesło'))
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
          label='tajne hesło'
          margin='normal'
          autoComplete='false'
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          variant='filled'
          sx={{
            backgroundColor: 'var(--input-bg)',
            borderRadius: 2,
          }}
          slotProps={{
            input: {
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
            },
          }}
        />

        <Box sx={{ mt: 2 }}>
          <Button
            color='primary'
            fullWidth
            size='large'
            type='submit'
            variant='contained'
          >
            Login
          </Button>
        </Box>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Button
          sx={{ color: 'var(--text-primary)' }}
          fullWidth
          size='large'
          variant='text'
          href='/authentication/login-with-email'
        >
          Abo maš samo account?
        </Button>
      </Box>
    </Container>
  )
}

export default LoginScreen
