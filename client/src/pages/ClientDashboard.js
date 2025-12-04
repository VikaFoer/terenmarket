import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  TextField,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Collapse,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Badge from '@mui/material/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Cart from '../components/Cart';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const drawerWidth = 280;

const ClientDashboard = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Категорії призначені адміном
  const [allCategories, setAllCategories] = useState([]); // Всі категорії
  const [expandedOtherCategories, setExpandedOtherCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [eurRate, setEurRate] = useState(null);
  const [usdRate, setUsdRate] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchAllCategories();
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  // Set default selected category to first assigned category
  useEffect(() => {
    if (categories.length > 0 && selectedCategory === null) {
      console.log('Setting default category to:', categories[0].id, categories[0].name);
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        console.log('Fetching currency rates from:', `${API_URL}/currency/rates/EUR`);
        // Fetch EUR rate
        const eurResponse = await axios.get(`${API_URL}/currency/rates/EUR`);
        console.log('EUR response:', eurResponse.data);
        if (eurResponse.data && eurResponse.data.rate) {
          setEurRate(eurResponse.data.rate);
          console.log('EUR rate set to:', eurResponse.data.rate);
        } else {
          console.warn('EUR rate not found in response:', eurResponse.data);
        }
        
        // Fetch USD rate
        const usdResponse = await axios.get(`${API_URL}/currency/rates/USD`);
        console.log('USD response:', usdResponse.data);
        if (usdResponse.data && usdResponse.data.rate) {
          setUsdRate(usdResponse.data.rate);
          console.log('USD rate set to:', usdResponse.data.rate);
        } else {
          console.warn('USD rate not found in response:', usdResponse.data);
        }
      } catch (error) {
        console.error('Error fetching currency rates:', error);
        console.error('Error details:', error.response?.data || error.message);
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

  useEffect(() => {
    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/client/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/client/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const allResponse = await axios.get(`${API_URL}/client/categories/all`);
      setAllCategories(allResponse.data);
    } catch (error) {
      console.error('Error fetching all categories:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        cost_price_eur: product.cost_price_eur || product.cost_price,
        coefficient: product.coefficient || 1.0,
        quantity: 1,
        image_url: product.image_url
      }]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    setCartItems(cartItems.map(item =>
      item.id === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartItemQuantity = (productId) => {
    const item = cartItems.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Filter products by selected category
  // If no category selected or category is null, show all products
  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category_id === selectedCategory)
    : products;
  
  // Debug logging
  useEffect(() => {
    console.log('=== Product Display Debug ===');
    console.log('Total products from API:', products.length);
    console.log('Selected category ID:', selectedCategory);
    console.log('Filtered products count:', filteredProducts.length);
    console.log('Available categories:', categories.map(c => ({ id: c.id, name: c.name })));
    if (selectedCategory) {
      const categoryProducts = products.filter(p => p.category_id === selectedCategory);
      console.log('Products in selected category:', categoryProducts.length);
      if (categoryProducts.length === 0 && products.length > 0) {
        console.warn('⚠️ No products found for selected category, but products exist. Category IDs:', 
          [...new Set(products.map(p => p.category_id))]);
      }
    }
  }, [products, selectedCategory, filteredProducts.length, categories]);

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category_name]) {
      acc[product.category_name] = [];
    }
    acc[product.category_name].push(product);
    return acc;
  }, {});

  // Generate SVG image for product (завжди працює)
  const getProductImage = (product) => {
    const productName = product.name;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', '#E74C3C', '#3498DB', '#1ABC9C', '#E67E22'];
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const bgColor = colors[colorIndex];
    
    // Create SVG data URL - це завжди працює
    const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="${bgColor}"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${productName}</text></svg>`;
    
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      <Toolbar />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
          Категорії
        </Typography>
      </Box>
      <Divider />
      <List>
        {/* Перша призначена категорія зверху */}
        {categories.length > 0 && (() => {
          const firstCategory = categories[0];
          const categoryProductsCount = products.filter(p => p.category_id === firstCategory.id).length;
          const isSelected = selectedCategory === firstCategory.id;
          
          return (
            <ListItem disablePadding>
              <ListItemButton
                selected={isSelected}
                onClick={() => setSelectedCategory(firstCategory.id)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: '#e3f2fd',
                    '&:hover': {
                      backgroundColor: '#bbdefb',
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                <ListItemText 
                  primary={firstCategory.name}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'primary.main' : 'text.primary'
                  }}
                />
                <Chip 
                  label={categoryProductsCount} 
                  size="small" 
                  color={isSelected ? "primary" : "default"}
                  variant={isSelected ? "filled" : "outlined"}
                  sx={{ ml: 1 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })()}
        
        {/* Інші категорії (включаючи інші призначені) */}
        {(() => {
          const assignedIds = categories.map(c => c.id);
          // Всі категорії крім першої призначеної
          const otherCategories = allCategories.filter(c => c.id !== (categories[0]?.id));
          
          if (otherCategories.length === 0) return null;
          
          return (
            <>
              <Divider sx={{ my: 1 }} />
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => setExpandedOtherCategories(!expandedOtherCategories)}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {expandedOtherCategories ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Інші категорії"
                    primaryTypographyProps={{
                      fontWeight: 500,
                      fontSize: '0.9rem'
                    }}
                  />
                  <Chip 
                    label={otherCategories.length} 
                    size="small" 
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </ListItemButton>
              </ListItem>
              <Collapse in={expandedOtherCategories} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {otherCategories.map((category) => {
                    const categoryProductsCount = products.filter(p => p.category_id === category.id).length;
                    const isSelected = selectedCategory === category.id;
                    
                    return (
                      <ListItem key={category.id} disablePadding>
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => setSelectedCategory(category.id)}
                          sx={{
                            pl: 4,
                            '&.Mui-selected': {
                              backgroundColor: '#e3f2fd',
                              '&:hover': {
                                backgroundColor: '#bbdefb',
                              },
                            },
                            '&:hover': {
                              backgroundColor: '#f5f5f5',
                            },
                          }}
                        >
                          <ListItemText 
                            primary={category.name}
                            primaryTypographyProps={{
                              fontWeight: isSelected ? 600 : 400,
                              color: isSelected ? 'primary.main' : 'text.primary'
                            }}
                          />
                          <Chip 
                            label={categoryProductsCount} 
                            size="small" 
                            color={isSelected ? "primary" : "default"}
                            variant={isSelected ? "filled" : "outlined"}
                            sx={{ ml: 1 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </>
          );
        })()}
      </List>
    </Box>
  );

  return (
    <Box 
      sx={{ 
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Video Background */}
      <Box
        component="video"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </Box>
      
      {/* Overlay for better readability */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      
      {/* Main Content */}
      <Box sx={{ display: 'flex', position: 'relative', zIndex: 2 }}>
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          backgroundColor: '#2c3e50',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            component="img"
            src="/logo.png"
            alt="SmartMarket Logo"
            sx={{
              height: { xs: 24, sm: 28 },
              width: 'auto',
              maxWidth: { xs: '120px', sm: '150px' },
              mr: { xs: 1, sm: 1.5 },
              objectFit: 'contain',
              display: 'flex',
              alignItems: 'center',
            }}
          />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            SmartMarket
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 0.5, sm: 2 },
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}>
            {!ratesLoading && (
              <>
                {eurRate && (
                  <Chip
                    label={`EUR: ${eurRate.toFixed(2)} ₴`}
                    size="small"
                    onClick={() => window.open('https://minfin.com.ua/ua/currency/mb/', '_blank')}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      height: { xs: 24, sm: 28 },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '& .MuiChip-label': {
                        px: { xs: 1, sm: 1.5 },
                      },
                      display: { xs: 'none', sm: 'flex' },
                    }}
                  />
                )}
                {usdRate && (
                  <Chip
                    label={`USD: ${usdRate.toFixed(2)} ₴`}
                    size="small"
                    onClick={() => window.open('https://minfin.com.ua/ua/currency/mb/', '_blank')}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      height: { xs: 24, sm: 28 },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '& .MuiChip-label': {
                        px: { xs: 1, sm: 1.5 },
                      },
                      display: { xs: 'none', sm: 'flex' },
                    }}
                  />
                )}
              </>
            )}
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.9, 
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            >
              {user?.login}
            </Typography>
          </Box>
          <IconButton 
            color="inherit" 
            onClick={() => setCartOpen(true)}
            sx={{ 
              p: { xs: 0.75, sm: 1 },
            }}
          >
            <Badge badgeContent={cartItemsCount} color="error">
              <ShoppingCartIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </Badge>
          </IconButton>
          <Button 
            color="inherit" 
            onClick={handleLogout} 
            startIcon={<LogoutIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />} 
            sx={{ 
              ml: { xs: 0.5, sm: 1 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 1.5 },
              display: { xs: 'none', sm: 'flex' },
            }}
          >
            Вихід
          </Button>
          <IconButton 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              display: { xs: 'flex', sm: 'none' },
              p: { xs: 0.75, sm: 1 },
            }}
          >
            <LogoutIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: '#E8F4F8',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: '#E8F4F8',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 3 } }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
              mb: { xs: 2, sm: 3 },
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {selectedCategory 
              ? categories.find(c => c.id === selectedCategory)?.name || 'Каталог товарів'
              : 'Каталог товарів'}
          </Typography>
          
          {loading ? (
            <Typography sx={{ color: 'white' }}>Завантаження...</Typography>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <Typography sx={{ color: 'white' }}>
              Немає доступних товарів
            </Typography>
          ) : (
            Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <Box key={category} sx={{ mb: 4 }}>
                {!selectedCategory && (
                  <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {category}
                  </Typography>
                )}
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  {categoryProducts.map((product, index) => {
                    const quantity = getCartItemQuantity(product.id);
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                        <Card sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          opacity: 0,
                          animation: 'fadeInUp 0.6s ease forwards',
                          animationDelay: `${index * 0.1}s`,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                          '@keyframes fadeInUp': {
                            from: {
                              opacity: 0,
                              transform: 'translateY(20px)',
                            },
                            to: {
                              opacity: 1,
                              transform: 'translateY(0)',
                            },
                          },
                          '&:hover': {
                            transform: { xs: 'none', sm: 'translateY(-4px)' },
                            boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.3)', sm: '0 8px 16px rgba(0,0,0,0.4)' },
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          },
                        }}>
                        <Box
                          sx={{
                            width: '100%',
                            height: { xs: 180, sm: 200 },
                            backgroundColor: '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <img
                            src={getProductImage(product)}
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            loading="lazy"
                            onError={(e) => {
                              // Fallback SVG if external image fails
                              const productName = product.name;
                              const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
                              let hash = 0;
                              for (let i = 0; i < productName.length; i++) {
                                hash = productName.charCodeAt(i) + ((hash << 5) - hash);
                              }
                              const bgColor = colors[Math.abs(hash) % colors.length];
                              const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="${bgColor}"/><text x="50%" y="50%" font-family="Arial" font-size="22" fill="white" text-anchor="middle" dominant-baseline="middle">${productName}</text></svg>`;
                              e.target.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
                            }}
                          />
                        </Box>
                          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
                              {product.name}
                            </Typography>
                            
                            <Box sx={{ mt: 'auto', pt: 2 }}>
                              <Box sx={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                mb: 2
                              }}>
                                <Box sx={{ 
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
                                    Ціна в євро:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'white' }}>
                                    {((product.cost_price_eur || product.cost_price || 0) * (product.coefficient || 1.0)).toFixed(2)} €
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                    Ваша ціна:
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                                    {product.price.toFixed(2)} грн
                                  </Typography>
                                </Box>
                              </Box>

                              {quantity > 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => updateQuantity(product.id, quantity - 1)}
                                    color="primary"
                                  >
                                    <RemoveIcon />
                                  </IconButton>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={quantity}
                                    onChange={(e) => {
                                      const newQuantity = Math.max(0, parseInt(e.target.value) || 0);
                                      if (newQuantity === 0) {
                                        removeFromCart(product.id);
                                      } else {
                                        updateQuantity(product.id, newQuantity);
                                      }
                                    }}
                                    inputProps={{ min: 0, style: { width: '50px', textAlign: 'center' } }}
                                    sx={{ width: 70 }}
                                  />
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', ml: 0.5 }}>
                                    {product.unit || 'шт'}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => updateQuantity(product.id, quantity + 1)}
                                    color="primary"
                                  >
                                    <AddIcon />
                                  </IconButton>
                                  <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600 }}>
                                    {(product.price * quantity).toFixed(2)} грн
                                  </Typography>
                                </Box>
                              ) : (
                                <Button
                                  variant="contained"
                                  fullWidth
                                  startIcon={<AddIcon />}
                                  onClick={() => addToCart(product)}
                                >
                                  Додати до корзини
                                </Button>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))
          )}
        </Container>
      </Box>

      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />
      </Box>
    </Box>
  );
};

export default ClientDashboard;
