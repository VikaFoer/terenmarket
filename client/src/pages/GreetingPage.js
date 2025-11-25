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

  // Generate SVG image for product
  const getProductImage = (product) => {
    const productName = product.name;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D', '#6BCB77', '#4D96FF'];
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const bgColor = colors[colorIndex];
    
    const svg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="${bgColor}"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${productName}</text></svg>`;
    
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
            }}
          >
            З Новим 2026 роком! 🎉
          </Typography>
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
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {products.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 3,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        height: { xs: 180, sm: 200 },
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                        }}
                      >
                        {product.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
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
