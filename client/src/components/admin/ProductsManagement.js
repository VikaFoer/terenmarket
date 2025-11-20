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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Alert,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';

// In production (monolithic deploy), use relative path since frontend and backend are on same domain
const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [coefficientsOpen, setCoefficientsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productCoefficients, setProductCoefficients] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    cost_price: '',
    image_url: '',
  });
  const [coefficientForm, setCoefficientForm] = useState({
    client_id: '',
    coefficient: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchClients();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Помилка завантаження продуктів');
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

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProductCoefficients = async (productId) => {
    try {
      const response = await axios.get(
        `${API_URL}/admin/products/${productId}/coefficients`
      );
      setProductCoefficients(response.data);
    } catch (error) {
      console.error('Error fetching coefficients:', error);
    }
  };

  const handleOpen = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category_id: product.category_id,
        cost_price: product.cost_price,
        image_url: product.image_url || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: '',
        cost_price: '',
        image_url: '',
      });
    }
    setOpen(true);
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: '',
      cost_price: '',
      image_url: '',
    });
    setError('');
    setSuccess('');
  };

  const handleCoefficientsOpen = async (product) => {
    setSelectedProduct(product);
    await fetchProductCoefficients(product.id);
    setCoefficientsOpen(true);
    setCoefficientForm({
      client_id: '',
      coefficient: '',
    });
  };

  const handleCoefficientsClose = () => {
    setCoefficientsOpen(false);
    setSelectedProduct(null);
    setProductCoefficients([]);
    setCoefficientForm({
      client_id: '',
      coefficient: '',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category_id) {
      setError('Назва та категорія обов\'язкові');
      return;
    }

    try {
      if (editingProduct) {
        await axios.put(`${API_URL}/admin/products/${editingProduct.id}`, {
          ...formData,
          cost_price: parseFloat(formData.cost_price) || 0,
        });
        setSuccess('Продукт оновлено успішно');
      } else {
        await axios.post(`${API_URL}/admin/products`, {
          ...formData,
          cost_price: parseFloat(formData.cost_price) || 0,
        });
        setSuccess('Продукт створено успішно');
      }
      fetchProducts();
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка збереження');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей продукт?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/products/${id}`);
      setSuccess('Продукт видалено успішно');
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка видалення');
    }
  };

  const handleCoefficientSubmit = async () => {
    if (!coefficientForm.client_id || !coefficientForm.coefficient) {
      setError('Виберіть клієнта та вкажіть коефіцієнт');
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/coefficients`, {
        client_id: coefficientForm.client_id,
        product_id: selectedProduct.id,
        coefficient: parseFloat(coefficientForm.coefficient),
      });
      setSuccess('Коефіцієнт встановлено успішно');
      await fetchProductCoefficients(selectedProduct.id);
      setCoefficientForm({
        client_id: '',
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
      await fetchProductCoefficients(selectedProduct.id);
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка видалення');
    }
  };

  const getProductPriceForClient = (product, clientId) => {
    const coefficient = productCoefficients.find(
      (c) => c.client_id === clientId && c.product_id === product.id
    );
    return (product.cost_price * (coefficient?.coefficient || 1.0)).toFixed(2);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Управління продуктами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Додати продукт
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
              <TableCell>Назва</TableCell>
              <TableCell>Категорія</TableCell>
              <TableCell>Собівартість</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.id}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category_name}</TableCell>
                <TableCell>{product.cost_price.toFixed(2)} грн</TableCell>
                <TableCell align="right">
                  <IconButton
                    color="primary"
                    onClick={() => handleOpen(product)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="secondary"
                    onClick={() => handleCoefficientsOpen(product)}
                  >
                    <SettingsIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(product.id)}
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
          {editingProduct ? 'Редагувати продукт' : 'Додати новий продукт'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Назва"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Категорія</InputLabel>
            <Select
              value={formData.category_id}
              onChange={(e) =>
                setFormData({ ...formData, category_id: e.target.value })
              }
              label="Категорія"
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Собівартість"
            type="number"
            value={formData.cost_price}
            onChange={(e) =>
              setFormData({ ...formData, cost_price: e.target.value })
            }
            margin="normal"
            inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            fullWidth
            label="URL картинки"
            value={formData.image_url}
            onChange={(e) =>
              setFormData({ ...formData, image_url: e.target.value })
            }
            margin="normal"
            placeholder="https://example.com/image.jpg або залиште порожнім для placeholder"
            helperText="Якщо порожнє, буде використано placeholder на основі назви товару"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProduct ? 'Зберегти' : 'Створити'}
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
          Коефіцієнти для продукту: {selectedProduct?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Додати/змінити коефіцієнт:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Клієнт</InputLabel>
                <Select
                  value={coefficientForm.client_id}
                  onChange={(e) =>
                    setCoefficientForm({
                      ...coefficientForm,
                      client_id: e.target.value,
                    })
                  }
                  label="Клієнт"
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.login}
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
                  <TableCell>Клієнт</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Коефіцієнт</TableCell>
                  <TableCell>Ціна</TableCell>
                  <TableCell align="right">Дії</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productCoefficients.map((coef) => (
                  <TableRow key={coef.id}>
                    <TableCell>{coef.client_login}</TableCell>
                    <TableCell>{coef.client_email || '-'}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={coef.coefficient}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          const updatedCoefficients = productCoefficients.map(c =>
                            c.id === coef.id ? { ...c, coefficient: newValue } : c
                          );
                          setProductCoefficients(updatedCoefficients);
                        }}
                        onBlur={async () => {
                          try {
                            await axios.put(`${API_URL}/admin/coefficients/${coef.id}`, {
                              coefficient: coef.coefficient,
                            });
                            setSuccess('Коефіцієнт оновлено успішно');
                            await fetchProductCoefficients(selectedProduct.id);
                          } catch (error) {
                            setError(error.response?.data?.error || 'Помилка оновлення коефіцієнта');
                            await fetchProductCoefficients(selectedProduct.id);
                          }
                        }}
                        inputProps={{ step: '0.01', min: '0', style: { width: '80px' } }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      {(
                        (selectedProduct?.cost_price || 0) * coef.coefficient
                      ).toFixed(2)}{' '}
                      грн
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
                {productCoefficients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
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

export default ProductsManagement;

