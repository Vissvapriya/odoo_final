import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  Badge,
  Chip,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LayoutDashboard,
  Users,
  Package,
  Store,
  FileCode,
  ShoppingCart,
  Receipt,
  Factory,
  History,
  LogOut,
  ChevronDown,
  UserCheck,
  Bell,
  Sun,
  Moon,
  Search
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const drawerWidth = 260;

const Layout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const { notifications, markAllAsRead, clearNotifications } = useSocket() || { notifications: [], markAllAsRead: () => {}, clearNotifications: () => {} };
  const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNotifOpen = (event) => {
    setNotifAnchorEl(event.currentTarget);
    if (markAllAsRead) markAllAsRead();
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Define grouped menu items based on role
  const getMenuItems = () => {
    const role = user?.role;
    
    const dashboardItem = { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: role === 'ADMIN' ? '/admin/dashboard' : `/${role?.toLowerCase()}/dashboard` };
    const userMgmtItem = { text: 'User Management', icon: <Users size={20} />, path: '/admin/users' };
    const customersItem = { text: 'Customers', icon: <UserCheck size={20} />, path: '/admin/customers' };
    const productsItem = { text: 'Products', icon: <Package size={20} />, path: '/admin/products' };
    const vendorsItem = { text: 'Vendors', icon: <Store size={20} />, path: '/admin/vendors' };
    const bomItem = { text: 'Bill of Materials', icon: <FileCode size={20} />, path: '/admin/boms' };
    const salesItem = { text: 'Sales Orders', icon: <ShoppingCart size={20} />, path: '/admin/sales-orders' };
    const purchaseItem = { text: 'Purchase Orders', icon: <Receipt size={20} />, path: '/admin/purchase-orders' };
    const mfgItem = { text: 'Mfg Orders', icon: <Factory size={20} />, path: '/admin/manufacturing-orders' };
    const auditItem = { text: 'Audit Logs', icon: <History size={20} />, path: '/admin/audit-logs' };
    const stockLedgerItem = { text: 'Stock Ledger', icon: <History size={20} />, path: '/admin/stock-ledger' };

    const menuGroups = [];

    // Dashboard group
    menuGroups.push({
      title: null,
      items: [dashboardItem]
    });

    // PRODUCTS Group
    menuGroups.push({
      title: 'PRODUCTS',
      items: [productsItem]
    });

    // SALES Group
    menuGroups.push({
      title: 'SALES',
      items: [customersItem, salesItem]
    });

    // PURCHASE Group
    menuGroups.push({
      title: 'PURCHASE',
      items: [vendorsItem, purchaseItem]
    });

    // MANUFACTURING Group
    menuGroups.push({
      title: 'MANUFACTURING',
      items: [bomItem, mfgItem]
    });

    // INVENTORY Group
    menuGroups.push({
      title: 'INVENTORY',
      items: [stockLedgerItem]
    });

    // REPORTS / AUDIT Group
    if (['ADMIN', 'OWNER'].includes(role)) {
      menuGroups.push({
        title: 'REPORTS',
        items: [auditItem]
      });
    }

    // USERS Group
    if (role === 'ADMIN') {
      menuGroups.push({
        title: 'USERS',
        items: [userMgmtItem]
      });
    }

    const allowedPaths = new Set();
    if (role === 'ADMIN') {
      allowedPaths.add('/admin/dashboard').add('/admin/users').add('/admin/customers').add('/admin/products').add('/admin/vendors').add('/admin/boms').add('/admin/sales-orders').add('/admin/purchase-orders').add('/admin/manufacturing-orders').add('/admin/stock-ledger').add('/admin/audit-logs');
    } else if (role === 'OWNER') {
      allowedPaths.add('/owner/dashboard').add('/admin/products').add('/admin/customers').add('/admin/vendors').add('/admin/boms').add('/admin/sales-orders').add('/admin/purchase-orders').add('/admin/manufacturing-orders').add('/admin/stock-ledger').add('/admin/audit-logs');
    } else if (role === 'SALES') {
      allowedPaths.add('/sales/dashboard').add('/admin/customers').add('/admin/sales-orders').add('/admin/products').add('/admin/vendors').add('/admin/boms').add('/admin/purchase-orders').add('/admin/manufacturing-orders');
    } else if (role === 'PURCHASE') {
      allowedPaths.add('/purchase/dashboard').add('/admin/vendors').add('/admin/purchase-orders').add('/admin/products').add('/admin/customers').add('/admin/boms').add('/admin/sales-orders').add('/admin/manufacturing-orders');
    } else if (role === 'MANUFACTURING') {
      allowedPaths.add('/manufacturing/dashboard').add('/admin/boms').add('/admin/manufacturing-orders').add('/admin/products').add('/admin/customers').add('/admin/vendors').add('/admin/sales-orders').add('/admin/purchase-orders');
    } else if (role === 'INVENTORY') {
      allowedPaths.add('/inventory/dashboard').add('/admin/stock-ledger').add('/admin/products').add('/admin/customers').add('/admin/vendors').add('/admin/boms').add('/admin/sales-orders').add('/admin/purchase-orders').add('/admin/manufacturing-orders');
    }

    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => allowedPaths.has(item.path))
    })).filter(group => group.items.length > 0);
  };

  const menuGroups = getMenuItems();
  const flattenedMenuItems = menuGroups.flatMap(group => group.items);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#714b67', color: '#fff' }}>
      {/* Brand Logo Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h6" fontWeight="bold" color="#fff"></Typography>
        </Box>
        <Typography variant="h6" fontWeight="700" letterSpacing={0.5} sx={{ color: '#fff' }}>
          Odoo ERP<span style={{ color: theme.palette.primary.main }}></span>
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      
      {/* Navigation Links */}
      <Box sx={{ flexGrow: 1, px: 2, py: 2, overflowY: 'auto' }}>
        {menuGroups.map((group, gIdx) => (
          <Box key={gIdx} sx={{ mb: 2 }}>
            {group.title && (
              <Typography variant="caption" sx={{ px: 2, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px', fontSize: 10, display: 'block', mb: 1 }}>
                {group.title}
              </Typography>
            )}
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 0 }}>
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                      sx={{
                        borderRadius: '12px',
                        py: 1,
                        px: 2,
                        color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                        bgcolor: active ? theme.palette.primary.main : 'transparent',
                        boxShadow: active ? '0 4px 12px rgba(113, 75, 103, 0.3)' : 'none',
                        '&:hover': {
                          bgcolor: active ? theme.palette.primary.main : 'rgba(255,255,255,0.1)',
                          color: '#fff',
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
                        {React.cloneElement(item.icon, { size: 18 })}
                      </ListItemIcon>
                      <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 500 }} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Footer Info / Logout */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: '12px',
            color: 'rgba(255,100,100,0.8)',
            '&:hover': {
              bgcolor: 'rgba(255,0,0,0.06)',
              color: 'rgb(255,100,100)',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
            <LogOut size={20} />
          </ListItemIcon>
          <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f3f4f6' }}>
      {/* Top Header App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: '1px solid #E5E7EB',
          bgcolor: '#f3f4f6',
          color: '#111827',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon size={24} />
          </IconButton>
          
          <Typography variant="h6" fontWeight="700" sx={{ fontSize: { xs: 16, sm: 18 }, color: '#111827', display: { xs: 'none', md: 'block' } }}>
            {flattenedMenuItems.find(item => item.path === location.pathname)?.text || 'ERP Console'}
          </Typography>

          {/* Search bar */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, justifyContent: 'center', mx: 4 }}>
            <Box sx={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
              <Box sx={{ position: 'absolute', top: '50%', left: '14px', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', opacity: 0.4 }}>
                <Search size={16} />
              </Box>
              <input
                type="text"
                placeholder="Global search modules, orders..."
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '38px',
                  paddingRight: '14px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#714b67';
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(113, 75, 103, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
            {/* Theme switch */}
            <Tooltip title="Toggle Theme mode">
              <IconButton onClick={() => setDarkMode(!darkMode)} sx={{ color: '#6B7280', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="View live updates">
              <IconButton onClick={handleNotifOpen} sx={{ color: '#6B7280', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
                <Badge badgeContent={unreadCount} color="error" max={99} sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16, px: 0.5 } }}>
                  <Bell size={20} />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={notifAnchorEl}
              open={Boolean(notifAnchorEl)}
              onClose={handleNotifClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  width: 320,
                  maxHeight: 400,
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  mt: 1,
                  p: 0,
                  border: '1px solid #E5E7EB'
                }
              }}
            >
              <Box sx={{ p: 1.5, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB' }}>
                <Typography variant="subtitle2" fontWeight="700">Notifications</Typography>
                {notifications.length > 0 && (
                  <Button size="small" onClick={clearNotifications} sx={{ fontSize: 11, textTransform: 'none', p: 0, minWidth: 0, color: '#714b67', fontWeight: 600 }}>
                    Clear All
                  </Button>
                )}
              </Box>
              <List sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center', color: '#6B7280' }}>
                    <Typography variant="body2" fontSize={13}>No notifications yet</Typography>
                  </Box>
                ) : (
                  notifications.map((n) => (
                    <ListItem 
                      key={n.id} 
                      divider 
                      sx={{ 
                        px: 2, 
                        py: 1.5, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start', 
                        bgcolor: n.read ? 'transparent' : 'rgba(113, 75, 103, 0.04)',
                        borderColor: '#E5E7EB'
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="600" sx={{ fontSize: 12.5, mb: 0.5, color: '#111827' }}>
                        {n.title}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12, color: '#6B7280', mb: 0.5, lineHeight: 1.4 }}>
                        {n.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </ListItem>
                  ))
                )}
              </List>
            </Menu>

            {/* Current role badge & profile */}
            <Box
              onClick={handleMenuOpen}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', p: 0.5, px: 1, borderRadius: '10px', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}
            >
              <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                {user?.name ? user.name.split(' ').map(n=>n[0]).join('') : 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="subtitle2" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.2 }}>{user?.name}</Typography>
                <Chip 
                  label={user?.role} 
                  size="small" 
                  sx={{ 
                    mt: 0.5,
                    bgcolor: '#f3f4f6', 
                    color: '#714b67', 
                    fontWeight: 700, 
                    fontSize: 9, 
                    height: 18,
                    borderRadius: '6px'
                  }} 
                />
              </Box>
              <ChevronDown size={14} style={{ opacity: 0.7 }} />
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  border: '1px solid #E5E7EB',
                  mt: 0.5
                }
              }}
            >
              <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
                <LogOut size={16} /> Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation Drawer */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
