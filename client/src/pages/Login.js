import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
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
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 }, position: 'relative', zIndex: 2 }}>
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
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2, sm: 3 } }}>
            <Box
              component="img"
              src="/logo.png"
              alt="Tecsa market Logo"
              sx={{
                height: { xs: 40, sm: 60, md: 80 },
                width: 'auto',
                maxWidth: { xs: '200px', sm: '250px', md: '300px' },
                objectFit: 'contain',
              }}
            />
          </Box>
          
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
    </Box>
  );
};

export default Login;

