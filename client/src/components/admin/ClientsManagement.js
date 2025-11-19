import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
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
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ClientsManagement = () => {
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [coefficientsOpen, setCoefficientsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientCoefficients, setClientCoefficients] = useState([]);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    email: '',
    phone: '',
    location: '',
    category_ids: [],
  });
  const [coefficientForm, setCoefficientForm] = useState({
    product_id: '',
    coefficient: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchClients();
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Помилка завантаження клієнтів');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchClientCoefficients = async (clientId) => {
    try {
      const response = await axios.get(
        `${API_URL}/admin/clients/${clientId}/coefficients`
      );
      setClientCoefficients(response.data);
    } catch (error) {
      console.error('Error fetching coefficients:', error);
    }
  };

  const handleOpen = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        login: client.login,
        password: '',
        email: client.email || '',
        phone: client.phone || '',
        location: client.location || '',
        category_ids: client.category_ids || [],
      });
    } else {
      setEditingClient(null);
      setFormData({
        login: '',
        password: '',
        email: '',
        phone: '',
        location: '',
        category_ids: [],
      });
    }
    setOpen(true);
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditingClient(null);
    setFormData({
      login: '',
      password: '',
      email: '',
      phone: '',
      location: '',
      category_ids: [],
    });
    setError('');
    setSuccess('');
  };

  const handleCategoryChange = (categoryId) => {
    setFormData((prev) => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter((id) => id !== categoryId)
        : [...prev.category_ids, categoryId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.login || (!editingClient && !formData.password)) {
      setError('Логін та пароль обов\'язкові');
      return;
    }

    try {
      if (editingClient) {
        await axios.put(`${API_URL}/admin/clients/${editingClient.id}`, formData);
        setSuccess('Клієнта оновлено успішно');
      } else {
        await axios.post(`${API_URL}/admin/clients`, formData);
        setSuccess('Клієнта створено успішно');
      }
      fetchClients();
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка збереження');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цього клієнта?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/clients/${id}`);
      setSuccess('Клієнта видалено успішно');
      fetchClients();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка видалення');
    }
  };

  const handleCoefficientsOpen = async (client) => {
    setSelectedClient(client);
    await fetchClientCoefficients(client.id);
    setCoefficientsOpen(true);
    setCoefficientForm({
      product_id: '',
      coefficient: '',
    });
  };

  const handleCoefficientsClose = () => {
    setCoefficientsOpen(false);
    setSelectedClient(null);
    setClientCoefficients([]);
    setCoefficientForm({
      product_id: '',
      coefficient: '',
    });
  };

  const handleCoefficientSubmit = async () => {
    if (!coefficientForm.product_id || !coefficientForm.coefficient) {
      setError('Виберіть продукт та вкажіть коефіцієнт');
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/coefficients`, {
        client_id: selectedClient.id,
        product_id: coefficientForm.product_id,
        coefficient: parseFloat(coefficientForm.coefficient),
      });
      setSuccess('Коефіцієнт встановлено успішно');
      await fetchClientCoefficients(selectedClient.id);
      setCoefficientForm({
        product_id: '',
        coefficient: '',
      });
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка збереження коефіцієнта');
    }
  };

  const handleDeleteCoefficient = async (id) => {
    try {
      await axios.delete(`${API_URL}/admin/coefficients/${id}`);
      setSuccess('Коефіцієнт видалено успішно');
      await fetchClientCoefficients(selectedClient.id);
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка видалення');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Управління клієнтами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Додати клієнта
        </Button>
      </Box>

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
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Логін</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Локація</TableCell>
              <TableCell>Категорії</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.id}</TableCell>
                <TableCell>{client.login}</TableCell>
                <TableCell>{client.email || '-'}</TableCell>
                <TableCell>{client.phone || '-'}</TableCell>
                <TableCell>{client.location || '-'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {client.category_ids && client.category_ids.length > 0
                      ? categories
                          .filter((cat) => client.category_ids.includes(cat.id))
                          .map((cat) => (
                            <Chip
                              key={cat.id}
                              label={cat.name}
                              size="small"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))
                      : '-'}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    color="primary"
                    onClick={() => handleOpen(client)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="secondary"
                    onClick={() => handleCoefficientsOpen(client)}
                  >
                    <SettingsIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(client.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingClient ? 'Редагувати клієнта' : 'Додати нового клієнта'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Логін"
            value={formData.login}
            onChange={(e) =>
              setFormData({ ...formData, login: e.target.value })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={editingClient ? 'Новий пароль (залиште порожнім, щоб не змінювати)' : 'Пароль'}
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            margin="normal"
            required={!editingClient}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Телефон"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Локація"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            margin="normal"
          />
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Доступні категорії:
          </Typography>
          <FormGroup>
            {categories.map((category) => (
              <FormControlLabel
                key={category.id}
                control={
                  <Checkbox
                    checked={formData.category_ids.includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                  />
                }
                label={category.name}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingClient ? 'Зберегти' : 'Створити'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={coefficientsOpen}
        onClose={handleCoefficientsClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Коефіцієнти для клієнта: {selectedClient?.login}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Додати/змінити коефіцієнт:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Продукт</InputLabel>
                <Select
                  value={coefficientForm.product_id}
                  onChange={(e) =>
                    setCoefficientForm({
                      ...coefficientForm,
                      product_id: e.target.value,
                    })
                  }
                  label="Продукт"
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name} ({product.category_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Коефіцієнт"
                type="number"
                value={coefficientForm.coefficient}
                onChange={(e) =>
                  setCoefficientForm({
                    ...coefficientForm,
                    coefficient: e.target.value,
                  })
                }
                inputProps={{ step: '0.01', min: '0' }}
                sx={{ width: 150 }}
              />
              <Button
                variant="contained"
                onClick={handleCoefficientSubmit}
                sx={{ alignSelf: 'flex-end' }}
              >
                Додати
              </Button>
            </Box>
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Поточні коефіцієнти:
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Продукт</TableCell>
                  <TableCell>Категорія</TableCell>
                  <TableCell>Собівартість</TableCell>
                  <TableCell>Коефіцієнт</TableCell>
                  <TableCell>Ціна</TableCell>
                  <TableCell align="right">Дії</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientCoefficients.map((coef) => (
                  <TableRow key={coef.id}>
                    <TableCell>{coef.product_name}</TableCell>
                    <TableCell>{coef.category_name}</TableCell>
                    <TableCell>{coef.cost_price.toFixed(2)} грн</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={coef.coefficient}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          const updatedCoefficients = clientCoefficients.map(c =>
                            c.id === coef.id ? { ...c, coefficient: newValue } : c
                          );
                          setClientCoefficients(updatedCoefficients);
                        }}
                        onBlur={async () => {
                          try {
                            await axios.put(`${API_URL}/admin/coefficients/${coef.id}`, {
                              coefficient: coef.coefficient,
                            });
                            setSuccess('Коефіцієнт оновлено успішно');
                            await fetchClientCoefficients(selectedClient.id);
                          } catch (error) {
                            setError(error.response?.data?.error || 'Помилка оновлення коефіцієнта');
                            await fetchClientCoefficients(selectedClient.id);
                          }
                        }}
                        inputProps={{ step: '0.01', min: '0', style: { width: '80px' } }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      {(coef.cost_price * coef.coefficient).toFixed(2)} грн
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteCoefficient(coef.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {clientCoefficients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Немає встановлених коефіцієнтів
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCoefficientsClose}>Закрити</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientsManagement;

