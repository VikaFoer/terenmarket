import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const GreetingPage = () => {
  const location = useLocation();
  const category = location.pathname.replace('/', ''); // Отримуємо категорію з URL
  const [greeting, setGreeting] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loadingGreeting, setLoadingGreeting] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const navigate = useNavigate();

  // Валідні категорії для привітань
  const validCategories = ['colorant', 'mix', 'bruker-o', 'axs', 'filter', 'lab'];

  useEffect(() => {
    // Перевіряємо чи це валідна категорія
    if (!category || !validCategories.includes(category)) {
      setError('Категорія не знайдена');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Отримуємо привітання та товари паралельно
        const [greetingResponse, productsResponse] = await Promise.all([
          axios.get(`${API_URL}/greetings/${category}`),
          axios.get(`${API_URL}/greetings/${category}/products`).catch(err => {
            // Якщо товари не знайдено, повертаємо порожній масив
            console.warn('Products not found or error:', err);
            return { data: [] };
          })
        ]);
        
        setGreeting(greetingResponse.data.greeting);
        setProducts(productsResponse.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Не вдалося завантажити дані');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category]);

  const handleGetNewGreeting = async () => {
    setLoadingGreeting(true);
    try {
      const response = await axios.get(`${API_URL}/greetings/${category}`);
      setGreeting(response.data.greeting);
    } catch (err) {
      console.error('Error fetching greeting:', err);
      setSnackbar({
        open: true,
        message: 'Не вдалося завантажити привітання',
        severity: 'error'
      });
    } finally {
      setLoadingGreeting(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setSnackbar({
        open: true,
        message: 'Будь ласка, введіть валідний email',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/greetings/register-email`, {
        email,
        category
      });

      setEmailSubmitted(true);
      setSnackbar({
        open: true,
        message: response.data.alreadyExists 
          ? 'Цей email вже зареєстровано' 
          : 'Email успішно зареєстровано! Ми зв\'яжемося з вами найближчим часом.',
        severity: 'success'
      });
      setEmail('');
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Помилка реєстрації. Спробуйте ще раз.',
        severity: 'error'
      });
    }
  };

  // Generate SVG image for product (більш акуратний дизайн)
  const getProductImage = (product) => {
    const productName = product.name;
    // Використовуємо більш приглушені, професійні кольори
    const gradients = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#30cfd0', '#330867'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
      ['#ffecd2', '#fcb69f'],
      ['#ff8a80', '#ea4c89'],
    ];
    
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradientIndex = Math.abs(hash) % gradients.length;
    const [color1, color2] = gradients[gradientIndex];
    
    // Створюємо більш акуратний SVG з градієнтом
    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#grad${hash})"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.95">${productName}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (error || !greeting) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error || 'Привітання не знайдено'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
          >
            На головну
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: { xs: 3, sm: 4 },
        px: 2,
      }}
    >
      <Container maxWidth="lg">
        {/* Логотип */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Box
            component="img"
            src="/logo.png"
            alt="SmartMarket Logo"
            sx={{
              height: { xs: 40, sm: 50 },
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Якщо логотип не знайдено, приховуємо його
              e.target.style.display = 'none';
            }}
          />
        </Box>
        {/* Привітання */}
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            textAlign: 'center',
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            mb: 4,
          }}
        >
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 500,
                color: '#2c3e50',
                lineHeight: 1.8,
                fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
              }}
            >
              {greeting}
            </Typography>
          </Box>

          <Typography
            variant="body1"
            sx={{
              color: '#7f8c8d',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              mb: 2,
            }}
          >
            З Новим 2026 роком! 🎉
          </Typography>
          
          <Button
            variant="outlined"
            onClick={handleGetNewGreeting}
            disabled={loadingGreeting}
            sx={{
              mt: 1,
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#764ba2',
                backgroundColor: 'rgba(102, 126, 234, 0.04)',
              },
            }}
          >
            {loadingGreeting ? 'Завантаження...' : 'Ще одне побажання'}
          </Button>
        </Paper>

        {/* Товари */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'white',
              mb: 3,
              textAlign: 'center',
              fontSize: { xs: '1.5rem', sm: '2rem' },
            }}
          >
            Товари категорії
          </Typography>
          
          {products.length === 0 ? (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Товари будуть додані найближчим часом
              </Typography>
            </Paper>
          ) : (
            <>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {(showAllProducts ? products : products.slice(0, 6)).map((product) => (
                  <Grid item xs={6} sm={4} md={3} lg={2.4} key={product.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.98)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                          borderColor: 'rgba(102, 126, 234, 0.3)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: { xs: 120, sm: 140 },
                          background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                            zIndex: 1,
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={getProductImage(product)}
                          alt={product.name}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'relative',
                            zIndex: 2,
                            transition: 'transform 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.05)',
                            },
                          }}
                        />
                      </Box>
                      <CardContent 
                        sx={{ 
                          flexGrow: 1,
                          p: { xs: 1, sm: 1.5 },
                          display: 'flex',
                          alignItems: 'center',
                          minHeight: { xs: 50, sm: 60 },
                        }}
                      >
                        <Typography
                          variant="body2"
                          component="h3"
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: '0.75rem', sm: '0.85rem' },
                            color: '#2c3e50',
                            lineHeight: 1.3,
                            textAlign: 'center',
                            width: '100%',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {product.name}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {products.length > 6 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowAllProducts(!showAllProducts)}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderColor: 'white',
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    {showAllProducts ? 'Згорнути' : `Розгорнути далі (${products.length - 6} товарів)`}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Форма реєстрації */}
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            textAlign: 'center',
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#2c3e50',
              mb: 2,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            }}
          >
            Хочете бачити персональні ціни?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#7f8c8d',
              mb: 3,
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }}
          >
            Залиште свій email, і ми зв'яжемося з вами для налаштування персонального доступу до цін
          </Typography>

          {!emailSubmitted ? (
            <Box
              component="form"
              onSubmit={handleEmailSubmit}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              <TextField
                type="email"
                placeholder="Ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Зареєструватись
              </Button>
            </Box>
          ) : (
            <Alert severity="success" sx={{ maxWidth: 500, mx: 'auto' }}>
              Дякуємо! Ми зв'яжемося з вами найближчим часом.
            </Alert>
          )}
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GreetingPage;
