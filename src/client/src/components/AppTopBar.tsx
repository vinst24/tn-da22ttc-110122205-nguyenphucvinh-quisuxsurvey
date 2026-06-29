import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from '@mui/material';
import { User } from 'lucide-react';
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { PATHS } from '../constants/paths';
import { useAuth } from '../contexts/AuthContext';

export const AppTopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <AppBar position="sticky" color="transparent" elevation={0}>
      <Toolbar disableGutters>
        <Container maxWidth="lg" className="flex items-center gap-3">
          <Typography
            variant="h6"
            component={RouterLink}
            to={PATHS.HOME}
            className="no-underline text-inherit font-semibold"
          >
            QUIS UX Survey
          </Typography>
          <Box className="flex-1" />
          {user && user.role !== 'ADMIN' && (
            <Button component={RouterLink} to={PATHS.SURVEY}>
              Khảo sát
            </Button>
          )}
          {user && (
            <Button component={RouterLink} to={PATHS.SURVEY_CODE}>
              Nhập mã
            </Button>
          )}
          {user?.role === 'ADMIN' && (
            <Button component={RouterLink} to={PATHS.ADMIN_DASHBOARD}>
              Admin
            </Button>
          )}

          {user ? (
            <div>
              <IconButton onClick={handleOpen} size="small" aria-controls={open ? 'account-menu' : undefined} aria-haspopup="true">
                <Avatar sx={{ width: 32, height: 32 }}>{user.fullName?.charAt(0) ?? user.email.charAt(0)}</Avatar>
              </IconButton>

              <Menu
                id="account-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                slotProps={{ paper: { sx: { mt: 1.5 } } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={() => { navigate(PATHS.PROFILE); }}>
                  <ListItemIcon>
                    <User className="w-4 h-4" />
                  </ListItemIcon>
                  <ListItemText>Chỉnh sửa thông tin</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { logout(); }}>
                  <ListItemText>Đăng xuất</ListItemText>
                </MenuItem>
              </Menu>
            </div>
          ) : (
            <>
              <Button component={RouterLink} to={PATHS.LOGIN}>
                Đăng nhập
              </Button>
              <Button variant="contained" component={RouterLink} to={PATHS.REGISTER}>
                Đăng ký
              </Button>
            </>
          )}
        </Container>
      </Toolbar>
    </AppBar>
  );
};

