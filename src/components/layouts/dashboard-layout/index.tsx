import { useState } from 'react'
import type { FC, ReactNode } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { styled } from '@mui/material/styles'
import DashboardNavbar from '../dashboard-navbar'
import DashboardSidebar from '../dashboard-sidebar'
import { NAVBAR_HEIGHT } from '../constants'
import useAuth from '../../../hooks/use-auth'

const DashboardLayoutRoot = styled('div')(() => ({
  backgroundColor: 'var(--bg-primary)',
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
  width: '100vw',
}))

const DashboardLayoutWrapper = styled('div', {
  shouldForwardProp: (prop: string) => prop[0] !== '$',
})<{ $ishidden: boolean }>(({ $ishidden, theme }) => ({
  display: 'flex',
  flex: '1 1 auto',
  overflow: 'hidden',
  backgroundColor: 'var(--bg-primary)',
  paddingTop: NAVBAR_HEIGHT + 'px',
  [theme.breakpoints.up('lg')]: {
    paddingLeft: $ishidden ? '0px' : '280px',
  },
}))

const DashboardLayoutContainer = styled('div')({
  display: 'flex',
  flex: '1 1 auto',
  overflow: 'hidden',
})

const DashboardLayoutContent = styled('div')({
  flex: '1 1 auto',
  height: '100%',
  overflow: 'auto',
  position: 'relative',
  WebkitOverflowScrolling: 'touch',
})

const DashboardLayout: FC<{
  children?: ReactNode
}> = () => {
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState<boolean>(false)

  const navigate = useNavigate()
  const { logout } = useAuth()

  const onSignOut = () => {
    logout()
  }

  return (
    <DashboardLayoutRoot>
      <DashboardNavbar
        onSidebarMobileOpen={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
        title={''}
        navigate={navigate}
      />
      <DashboardSidebar
        onMobileClose={(): void => setIsSidebarMobileOpen(false)}
        openMobile={isSidebarMobileOpen}
        onSignOut={onSignOut}
      />
      <DashboardLayoutWrapper $ishidden={false}>
        <DashboardLayoutContainer>
          <DashboardLayoutContent>
            <Outlet />
          </DashboardLayoutContent>
        </DashboardLayoutContainer>
      </DashboardLayoutWrapper>
    </DashboardLayoutRoot>
  )
}

export default DashboardLayout
