import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Visibility,
  Email,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const categoryNames = {
  'colorant': 'Колоранти',
  'mix': 'Колірувальне обладнання',
  'bruker-o': 'Брукер Оптікс (БІЧ)',
  'axs': 'Брукер АХС',
  'filter': 'Фільтри',
  'lab': 'Лабораторка'
};

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [qrStats, setQrStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsResponse, qrResponse, dashboardResponse] = await Promise.all([
        axios.get(`${API_URL}/analytics/stats`),
        axios.get(`${API_URL}/analytics/qr-pages`),
        axios.get(`${API_URL}/analytics/dashboard?days=7`),
      ]);

      setStats(statsResponse.data);
      setQrStats(qrResponse.data);
      setDashboardData(dashboardResponse.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Помилка завантаження аналітики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Основні метрики */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Всього подій
                  </Typography>
                  <Typography variant="h4">
                    {stats?.total || 0}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: '#667eea', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Сесії
                  </Typography>
                  <Typography variant="h4">
                    {stats?.sessions || 0}
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, color: '#667eea', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Унікальні користувачі
                  </Typography>
                  <Typography variant="h4">
                    {stats?.users || 0}
                  </Typography>
                </Box>
                <Visibility sx={{ fontSize: 40, color: '#667eea', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Email реєстрації
                  </Typography>
                  <Typography variant="h4">
                    {qrStats?.emailRegistrations?.reduce((sum, item) => sum + item.registrations, 0) || 0}
                  </Typography>
                </Box>
                <Email sx={{ fontSize: 40, color: '#667eea', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR сторінки аналітика */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Відвідуваність QR-сторінок
            </Typography>
            {qrStats?.qrPages && qrStats.qrPages.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Сторінка</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Відвідувань</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Переглядів</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {qrStats.qrPages.map((page) => {
                      const categoryKey = page.page_path.replace('/', '');
                      return (
                        <TableRow key={page.page_path} hover>
                          <TableCell>
                            <Chip 
                              label={categoryNames[categoryKey] || page.page_path}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {page.unique_visits}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {page.total_views}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Немає даних про QR-сторінки
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Email реєстрації по категоріях
            </Typography>
            {qrStats?.emailRegistrations && qrStats.emailRegistrations.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Категорія</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Реєстрацій</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {qrStats.emailRegistrations.map((item) => (
                      <TableRow key={item.category} hover>
                        <TableCell>
                          <Chip 
                            label={categoryNames[item.category] || item.category}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.registrations}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Немає email реєстрацій
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Популярні сторінки
            </Typography>
            {stats?.topPages && stats.topPages.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Сторінка</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Переглядів</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.topPages.map((page) => (
                      <TableRow key={page.page_path} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {page.page_path}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {page.views}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Немає даних про сторінки
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;

