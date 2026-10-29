import {
  styled,
  AppBar,
  Box,
  Toolbar,
  IconButton,
  AppBarProps,
} from '@mui/material'
import { FC } from 'react'
import { NavigateFunction } from 'react-router-dom'
import MenuIcon from '@mui/icons-material/Menu'
import { NAVBAR_HEIGHT } from '../constants'
import ThemeToggle from '../../theme-toggle'

interface DashboardNavbarProps extends AppBarProps {
  onSidebarMobileOpen?: () => void
  title: string
  navigate: NavigateFunction
}

const DashboardNavbarRoot = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'var(--bg-primary)',
  borderBottom: '1px solid var(--border-color)',
  boxShadow: 'none',
  color: 'var(--text-primary)',
  zIndex: theme.zIndex.drawer + 100,
}))

const DashboardNavbar: FC<DashboardNavbarProps> = props => {
  const { onSidebarMobileOpen, navigate, ...other } = props

  return (
    <DashboardNavbarRoot {...other}>
      <Toolbar
        sx={{
          height: NAVBAR_HEIGHT,
          display: 'flex',
          justifyContent: { xs: 'space-between', lg: 'flex-end' },
          flexDirection: 'row',
        }}
      >
        <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
          <IconButton
            onClick={onSidebarMobileOpen}
            sx={{ color: 'var(--accent-color)' }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <ThemeToggle />
      </Toolbar>
    </DashboardNavbarRoot>
  )
}

export default DashboardNavbar
