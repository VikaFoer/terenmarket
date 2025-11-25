import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

// Мапінг категорій до назв
const categoryNames = {
  'colorant': 'Колоранти',
  'mix': 'Колірувальне обладнання',
  'bruker-o': 'Брукер Оптікс (БІЧ)',
  'axs': 'Брукер АХС',
  'filter': 'Фільтри',
  'lab': 'Лабораторка'
};

const GreetingPage = () => {
  const location = useLocation();
  const category = location.pathname.replace('/', ''); // Отримуємо категорію з URL
  const [greeting, setGreeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

    const fetchGreeting = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/greetings/${category}`);
        setGreeting(response.data.greeting);
        setError(null);
      } catch (err) {
        console.error('Error fetching greeting:', err);
        setError('Не вдалося завантажити привітання');
      } finally {
        setLoading(false);
      }
    };

    fetchGreeting();
  }, [category]);

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 6, md: 8 },
            textAlign: 'center',
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: '#2c3e50',
              mb: 3,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            }}
          >
            {categoryNames[category] || category}
          </Typography>

          <Box
            sx={{
              my: 4,
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              minHeight: { xs: 150, sm: 200 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 500,
                color: '#2c3e50',
                lineHeight: 1.8,
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              }}
            >
              {greeting}
            </Typography>
          </Box>

          <Box sx={{ mt: 4 }}>
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
              onClick={() => window.location.reload()}
              sx={{
                mt: 2,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Отримати інше привітання
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default GreetingPage;

