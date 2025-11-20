import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Chip,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import LogoutIcon from '@mui/icons-material/Logout';
import ClientsManagement from '../components/admin/ClientsManagement';
import ProductsManagement from '../components/admin/ProductsManagement';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const drawerWidth = 240;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [eurRate, setEurRate] = useState(null);
  const [usdRate, setUsdRate] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  const menuItems = [
    { text: 'Клієнти', path: '/admin/clients', icon: <PeopleIcon /> },
    { text: 'Продукти', path: '/admin/products', icon: <InventoryIcon /> },
  ];

  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Fetch EUR rate
        const eurResponse = await axios.get(`${API_URL}/currency/rates/EUR`);
        if (eurResponse.data && eurResponse.data.rate) {
          setEurRate(eurResponse.data.rate);
        }
        
        // Fetch USD rate
        const usdResponse = await axios.get(`${API_URL}/currency/rates/USD`);
        if (usdResponse.data && usdResponse.data.rate) {
          setUsdRate(usdResponse.data.rate);
        }
      } catch (error) {
        console.error('Error fetching currency rates:', error);
        // Try to fetch again after 30 seconds if failed
        setTimeout(fetchRates, 30000);
      } finally {
        setRatesLoading(false);
      }
    };
    fetchRates();
    // Update every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#2c3e50',
        }}
      >
        <Toolbar sx={{ pl: 2 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="SmartMarket Logo"
            sx={{
              height: 28,
              mr: 1.5,
              objectFit: 'contain',
            }}
          />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            SmartMarket - Адмін панель
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!ratesLoading && (
              <>
                {eurRate && (
                  <Chip
                    label={`EUR: ${eurRate.toFixed(2)} ₴`}
                    size="small"
                    onClick={() => window.open('https://www.udinform.com/index.php?option=com_dealingquotation&task=forexukrarchive', '_blank')}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '& .MuiChip-label': {
                        px: 1.5,
                      },
                    }}
                  />
                )}
                {usdRate && (
                  <Chip
                    label={`USD: ${usdRate.toFixed(2)} ₴`}
                    size="small"
                    onClick={() => window.open('https://www.udinform.com/index.php?option=com_dealingquotation&task=forexukrarchive', '_blank')}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '& .MuiChip-label': {
                        px: 1.5,
                      },
                    }}
                  />
                )}
              </>
            )}
            <Typography variant="body2" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center' }}>
              {user?.login}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid #e0e0e0',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Вихід" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Container maxWidth="xl">
          <Routes>
            <Route path="clients" element={<ClientsManagement />} />
            <Route path="products" element={<ProductsManagement />} />
            <Route path="*" element={<ClientsManagement />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
};

export default AdminDashboard;

