import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await authLogin(login, password);
    
    if (result.success) {
      // Determine if admin or client (for now, admin login is 'admin')
      if (login === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 2, sm: 0 },
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            width: '100%', 
            borderRadius: 3,
            mx: { xs: 1, sm: 0 },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, sm: 3 } }}>
            <Box
              component="img"
              src="/logo.png"
              alt="SmartMarket Logo"
              sx={{
                height: { xs: 60, sm: 80 },
                objectFit: 'contain',
              }}
            />
          </Box>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center" 
            sx={{ 
              mb: { xs: 2, sm: 3 }, 
              fontWeight: 600, 
              color: '#2c3e50',
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
            }}
          >
            SmartMarket
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Логін"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: { xs: 2, sm: 3 }, 
                mb: 2,
                py: { xs: 1.25, sm: 1 },
                fontSize: { xs: '1rem', sm: '0.875rem' },
              }}
              disabled={loading}
            >
              Увійти
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

