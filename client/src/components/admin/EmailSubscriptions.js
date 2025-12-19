import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import axios from 'axios';
import AnalyticsDashboard from './AnalyticsDashboard';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api');

const categoryNames = {
  'colorant': 'Колоранти',
  'mix': 'Колірувальне обладнання',
  'bruker-o': 'Брукер Оптікс (БІЧ)',
  'axs': 'Брукер АХС',
  'filter': 'Фільтри',
  'lab': 'Лабораторка'
};

const EmailSubscriptions = () => {
  const [tabValue, setTabValue] = useState(0);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, email: '' });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/email-subscriptions`);
      setSubscriptions(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setError('Помилка завантаження підписок');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id, email) => {
    setDeleteDialog({ open: true, id, email });
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${API_URL}/admin/email-subscriptions/${deleteDialog.id}`);
      setSuccess('Підписку успішно видалено');
      fetchSubscriptions();
      setDeleteDialog({ open: false, id: null, email: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Помилка видалення підписки');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Завантаження...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <EmailIcon sx={{ fontSize: 32, color: '#667eea' }} />
          <Typography variant="h4">Email підписки та аналітика</Typography>
        </Box>
        {tabValue === 0 && (
          <Chip 
            label={`Всього: ${subscriptions.length}`} 
            color="primary" 
            sx={{ fontSize: '1rem', py: 2.5 }}
          />
        )}
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab icon={<EmailIcon />} iconPosition="start" label="Підписки" />
        <Tab icon={<AnalyticsIcon />} iconPosition="start" label="Аналітика" />
      </Tabs>

      {tabValue === 1 && (
        <AnalyticsDashboard />
      )}

      {tabValue === 0 && (
        <>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Категорія</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Дата реєстрації</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 100 }}>Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Підписок поки немає
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => (
                <TableRow key={subscription.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 500 }}>{subscription.email}</Typography>
                  </TableCell>
                  <TableCell>
                    {subscription.category ? (
                      <Chip 
                        label={categoryNames[subscription.category] || subscription.category} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(subscription.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(subscription.id, subscription.email)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, email: '' })}>
        <DialogTitle>Видалити підписку?</DialogTitle>
        <DialogContent>
          <Typography>
            Ви впевнені, що хочете видалити підписку для <strong>{deleteDialog.email}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, email: '' })}>
            Скасувати
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
};

export default EmailSubscriptions;




