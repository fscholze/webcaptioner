import { FC } from 'react'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Divider from '@mui/material/Divider'
import Settings from '@mui/icons-material/Settings'
import Logout from '@mui/icons-material/Logout'

export const ProfileMenu: FC<{
  anchorEl: HTMLElement
  isOpen: boolean
  handleClose: () => void
  handleSignOut: () => void
  handleProfile: () => void
  handleSettings: () => void
}> = ({
  anchorEl,
  isOpen,
  handleClose,
  handleSignOut,
  handleProfile,
  handleSettings,
}) => (
  <Menu
    anchorEl={anchorEl}
    id='account-menu'
    open={isOpen}
    onClose={handleClose}
    onClick={handleClose}
    slotProps={{
      paper: {
      elevation: 0,
      sx: {
        overflow: 'visible',
        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
        mt: 1.5,
        '& .MuiAvatar-root': {
          width: 32,
          height: 32,
          ml: -0.5,
          mr: 1,
        },
        '&::before': {
          content: '""',
          display: 'block',
          position: 'absolute',
          top: 0,
          right: 14,
          width: 10,
          height: 10,
          bgcolor: 'background.paper',
          transform: 'translateY(-50%) rotate(45deg)',
          zIndex: 0,
        },
      },
      },
    }}
    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
  >
    <MenuItem onClick={handleProfile}>
      <Avatar /> Profile
    </MenuItem>
    {/* <MenuItem onClick={handleOpenProductions}>
      <Avatar /> My productions
    </MenuItem> */}
    <Divider />
    <MenuItem onClick={handleSettings}>
      <ListItemIcon>
        <Settings fontSize='small' />
      </ListItemIcon>
      Settings
    </MenuItem>
    <MenuItem onClick={handleSignOut}>
      <ListItemIcon>
        <Logout fontSize='small' />
      </ListItemIcon>
      Logout
    </MenuItem>
  </Menu>
)
