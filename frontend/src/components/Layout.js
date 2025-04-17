import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Book as BookIcon,
  Timer as TimerIcon,
  History as HistoryIcon,
  Savings as SavingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import API from '../services/api';

// サイドバーの幅
const drawerWidth = 240;

function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // メニュー項目
  const menuItems = [
    { text: 'ダッシュボード', icon: <DashboardIcon />, path: '/' },
    { text: '勉強タイマー', icon: <TimerIcon />, path: '/timer' },
    { text: '勉強科目', icon: <BookIcon />, path: '/subjects' },
    { text: '勉強記録', icon: <HistoryIcon />, path: '/sessions' },
    { text: '貯金目標', icon: <SavingsIcon />, path: '/goals' },
    { text: '学習分析', icon: <PsychologyIcon />, path: '/analysis' },
  ];
  
  // モバイルでのドロワー開閉
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // プロフィールメニュー開閉
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // ログアウト処理
  const handleLogout = async () => {
    try {
      await API.auth.logout();
      logout(); // AuthContextのlogout関数を呼び出し
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };
  
  // 現在のパスに基づいてタイトルを取得
  const getTitle = () => {
    const item = menuItems.find(item => item.path === location.pathname);
    return item ? item.text : 'StudySavings';
  };
  
  // サイドバーの内容
  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          StudySavings
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'rgba(74, 144, 226, 0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(74, 144, 226, 0.12)',
                },
              },
              borderRadius: '0 20px 20px 0',
              marginRight: 2,
              marginY: 0.5,
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ 
                fontWeight: location.pathname === item.path ? 600 : 400,
                color: location.pathname === item.path ? 'primary.main' : 'inherit'
              }} 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getTitle()}
          </Typography>
          <IconButton onClick={handleMenu} size="large" edge="end" color="inherit">
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: 'primary.main'
              }}
            >
              <PersonIcon fontSize="small" />
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem 
              onClick={() => {
                handleClose();
                handleLogout();
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>ログアウト</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* サイドバー - モバイル */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // モバイル向けのパフォーマンス向上
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* サイドバー - デスクトップ */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none',
              backgroundColor: 'transparent',
              boxShadow: 'none'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
