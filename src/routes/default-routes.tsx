import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

const LoginWithEmail = lazy(() => import('../features/auth/login-with-email'))
const Login = lazy(() => import('../features/auth/login'))
const KeycloakCallback = lazy(
  () => import('../features/auth/keycloak-callback'),
)
const GuestGuard = lazy(() => import('../components/guards/guest-guard'))
const CastScreen = lazy(() => import('../features/cast-screen'))

export const defaultRoutes = [
  {
    path: 'authentication',
    children: [
      {
        path: 'login-with-email',
        element: (
          <GuestGuard>
            <LoginWithEmail />
          </GuestGuard>
        ),
      },
      {
        path: 'login',
        element: (
          <GuestGuard>
            <Login />
          </GuestGuard>
        ),
      },
      {
        path: 'callback',
        element: (
          <GuestGuard>
            <KeycloakCallback />
          </GuestGuard>
        ),
      },
    ],
  },
  {
    path: 'cast',
    element: <CastScreen />,
  },
  {
    path: 'cast/:token',
    element: <CastScreen />,
  },
  {
    path: 'login',
    element: <Navigate to='/authentication/login' />,
  },
  { path: '*', element: <Navigate to='/authentication/login' /> },
]
