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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { format, subDays, parseISO } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const categoryNames = {
  '/colorant': 'Колоранти',
  '/mix': 'Колірувальне обладнання',
  '/bruker-o': 'Брукер Оптікс (БІЧ)',
  '/axs': 'Брукер АХС',
  '/filter': 'Фільтри',
  '/lab': 'Лабораторка'
};

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState('7'); // days

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');

      const response = await axios.get(`${API_URL}/analytics/stats`, {
        params: { startDate, endDate },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setStats(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Помилка завантаження аналітики');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd.MM');
    } catch {
      return dateString;
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

  if (!stats) {
    return (
      <Alert severity="info">
        Дані аналітики поки відсутні
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Аналітика відвідуваності
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Період</InputLabel>
          <Select
            value={dateRange}
            label="Період"
            onChange={(e) => setDateRange(e.target.value)}
          >
            <MenuItem value="7">Останні 7 днів</MenuItem>
            <MenuItem value="30">Останні 30 днів</MenuItem>
            <MenuItem value="90">Останні 90 днів</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Унікальні сесії
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.overview?.unique_sessions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Всього подій
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.overview?.total_events || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Унікальні користувачі
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.overview?.unique_users || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                QR-сторінки відвідано
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.qrPages?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Statistics Chart */}
      {stats.dailyStats && stats.dailyStats.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Динаміка відвідуваності
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.dailyStats.map(d => ({
              date: formatDate(d.date),
              Сесії: d.sessions,
              Події: d.events
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Сесії" stroke="#667eea" strokeWidth={2} />
              <Line type="monotone" dataKey="Події" stroke="#764ba2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* QR Pages Statistics */}
      {stats.qrPages && stats.qrPages.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Статистика QR-сторінок
              </Typography>
              <Box sx={{ mt: 2 }}>
                {stats.qrPages.map((page) => (
                  <Box key={page.page_path} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {categoryNames[page.page_path] || page.page_path}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Переглядів: ${page.total_views}`} size="small" color="primary" />
                      <Chip label={`Відвідувачів: ${page.unique_visitors}`} size="small" />
                      <Chip label={`Email: ${page.email_signups || 0}`} size="small" color="success" />
                      <Chip label={`Привітань: ${page.greeting_views || 0}`} size="small" />
                      <Chip label={`Розгорнуто: ${page.expand_clicks || 0}`} size="small" />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Популярність QR-сторінок
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.qrPages.map(p => ({
                  name: categoryNames[p.page_path] || p.page_path,
                  Відвідувачі: p.unique_visitors
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Відвідувачі" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Page Views */}
      {stats.pageViews && stats.pageViews.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Популярні сторінки
          </Typography>
          <Box sx={{ mt: 2 }}>
            {stats.pageViews.slice(0, 10).map((page) => (
              <Box key={page.page_path} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="body2">{page.page_path}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Переглядів: {page.views}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Унікальних: {page.unique_views}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Event Types */}
      {stats.eventTypes && stats.eventTypes.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Типи подій
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {stats.eventTypes.map((event) => (
              <Chip
                key={event.event_type}
                label={`${event.event_type}: ${event.count}`}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;
