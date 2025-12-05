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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import axios from 'axios';

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
    unit: 'шт',
    price_currency: 'EUR',
    cost_price_eur: '',
    cost_price_uah: '',
    card_color: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [coefficientForm, setCoefficientForm] = useState({
    client_id: '',
    coefficient: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addingTestProducts, setAddingTestProducts] = useState(false);
  const [addingQRTestProducts, setAddingQRTestProducts] = useState(false);
  const [addingFilterProducts, setAddingFilterProducts] = useState(false);
  const [deletingColorantProducts, setDeletingColorantProducts] = useState(false);
  const [syncingDatabase, setSyncingDatabase] = useState(false);
  const [checkingDatabase, setCheckingDatabase] = useState(false);
  const [dbDiagnostics, setDbDiagnostics] = useState(null);
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
        unit: product.unit || 'шт',
        price_currency: product.price_currency || 'EUR',
        cost_price_eur: product.cost_price_eur !== null && product.cost_price_eur !== undefined ? product.cost_price_eur : '',
        cost_price_uah: product.cost_price_uah !== null && product.cost_price_uah !== undefined ? product.cost_price_uah : '',
        card_color: product.card_color || '',
      });
      setImagePreview(product.image_url || null);
      setSelectedImageFile(null);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: '',
        cost_price: '',
        image_url: '',
        unit: 'шт',
        price_currency: 'EUR',
        cost_price_eur: '',
        cost_price_uah: '',
        card_color: '',
      });
      setImagePreview(null);
      setSelectedImageFile(null);
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
      unit: 'шт',
      price_currency: 'EUR',
      cost_price_eur: '',
      cost_price_uah: '',
      card_color: '',
    });
    setImagePreview(null);
    setSelectedImageFile(null);
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

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      // Створюємо preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImageFile || !editingProduct) {
      setError('Виберіть файл та продукт для завантаження');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', selectedImageFile);

      const response = await axios.post(
        `${API_URL}/admin/products/${editingProduct.id}/upload-image`,
        formDataUpload,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess('Зображення завантажено успішно');
      setFormData({ ...formData, image_url: response.data.image_url });
      setImagePreview(response.data.image_url);
      setSelectedImageFile(null);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка завантаження зображення');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async () => {
    if (!editingProduct) {
      setError('Виберіть продукт для видалення зображення');
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/products/${editingProduct.id}/image`);
      setSuccess('Зображення видалено успішно');
      setFormData({ ...formData, image_url: '' });
      setImagePreview(null);
      setSelectedImageFile(null);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка видалення зображення');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category_id) {
      setError('Назва та категорія обов\'язкові');
      return;
    }

    try {
      const submitData = {
        ...formData,
        cost_price: parseFloat(formData.cost_price) || 0,
        price_currency: formData.price_currency || 'EUR',
        cost_price_eur: formData.cost_price_eur ? parseFloat(formData.cost_price_eur) : null,
        cost_price_uah: formData.cost_price_uah ? parseFloat(formData.cost_price_uah) : null,
      };
      
      if (editingProduct) {
        await axios.put(`${API_URL}/admin/products/${editingProduct.id}`, submitData);
        setSuccess('Продукт оновлено успішно');
      } else {
        await axios.post(`${API_URL}/admin/products`, submitData);
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

  const handleAddTestProducts = async () => {
    if (!window.confirm('Додати тестові товари для всіх категорій? Це додасть близько 37 товарів.')) {
      return;
    }

    setAddingTestProducts(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/admin/products/add-test-products`);
      setSuccess(response.data.message || `Додано ${response.data.added} товарів`);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка додавання тестових товарів');
    } finally {
      setAddingTestProducts(false);
    }
  };

  const handleAddQRTestProducts = async () => {
    if (!window.confirm('Додати тестові товари для QR-сторінок? Це додасть по 10 товарів для кожної з 6 категорій (60 товарів).')) {
      return;
    }

    setAddingQRTestProducts(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/admin/products/add-qr-test-products`);
      setSuccess(response.data.message || `Додано ${response.data.added} товарів`);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка додавання QR тестових товарів');
    } finally {
      setAddingQRTestProducts(false);
    }
  };

  const handleAddFilterProducts = async () => {
    if (!window.confirm('Додати 10 товарів до категорії "Фільтри"?')) {
      return;
    }

    setAddingFilterProducts(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/admin/products/add-filter-products`);
      setSuccess(response.data.message || `Додано ${response.data.added} товарів`);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка додавання товарів категорії "Фільтри"');
    } finally {
      setAddingFilterProducts(false);
    }
  };

  const handleDeleteColorantProducts = async () => {
    if (!window.confirm('Ви впевнені, що хочете видалити ВСІ товари з категорії "Колоранти"? Цю дію неможливо скасувати!')) {
      return;
    }

    setDeletingColorantProducts(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_URL}/admin/products/delete-colorant-products`);
      setSuccess(response.data.message || `Видалено ${response.data.deleted} товарів`);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка видалення товарів з категорії "Колоранти"');
    } finally {
      setDeletingColorantProducts(false);
    }
  };

  const handleCheckDatabase = async () => {
    setCheckingDatabase(true);
    setError('');
    setSuccess('');
    setDbDiagnostics(null);

    try {
      const response = await axios.get(`${API_URL}/admin/db-diagnostics`);
      setDbDiagnostics(response.data);
      setSuccess('Діагностика бази даних завершена');
    } catch (error) {
      setError(error.response?.data?.error || 'Помилка перевірки бази даних');
    } finally {
      setCheckingDatabase(false);
    }
  };

  const handleSyncDatabase = async () => {
    // Створюємо input для вибору файлу
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!window.confirm('Синхронізувати базу даних? Це замінить всі товари, клієнтів та коефіцієнти на Railway.')) {
        return;
      }

      setSyncingDatabase(true);
      setError('');
      setSuccess('');

      try {
        const fileContent = await file.text();
        const exportData = JSON.parse(fileContent);

        const response = await axios.post(`${API_URL}/db-restore`, exportData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        setSuccess(`База даних синхронізована! Імпортовано: ${response.data.imported.products} товарів, ${response.data.imported.clients} клієнтів`);
        
        // Оновлюємо список товарів та клієнтів
        fetchProducts();
        window.location.reload(); // Перезавантажуємо сторінку для оновлення всіх даних
      } catch (error) {
        setError(error.response?.data?.error || error.response?.data?.message || 'Помилка синхронізації бази даних');
      } finally {
        setSyncingDatabase(false);
      }
    };
    input.click();
  };

  const getProductPriceForClient = (product, clientId) => {
    const coefficient = productCoefficients.find(
      (c) => c.client_id === clientId && c.product_id === product.id
    );
    return (product.cost_price * (coefficient?.coefficient || 1.0)).toFixed(2);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Управління продуктами
      </Typography>

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

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen(null)}
        >
          Додати товар
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Назва</TableCell>
              <TableCell>Категорія</TableCell>
              <TableCell>Собівартість</TableCell>
              <TableCell>Одиниця</TableCell>
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
                <TableCell>{product.unit || 'шт'}</TableCell>
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Валюта початкової ціни</InputLabel>
              <Select
                value={formData.price_currency}
                onChange={(e) =>
                  setFormData({ ...formData, price_currency: e.target.value })
                }
                label="Валюта початкової ціни"
              >
                <MenuItem value="EUR">Євро (EUR)</MenuItem>
                <MenuItem value="UAH">Гривня (UAH)</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                label="Ціна в євро (€)"
                type="number"
                value={formData.cost_price_eur}
                onChange={(e) =>
                  setFormData({ ...formData, cost_price_eur: e.target.value })
                }
                inputProps={{ step: '0.01', min: '0' }}
                helperText="Введіть ціну в євро"
              />
              <TextField
                fullWidth
                label="Ціна в гривнях (₴)"
                type="number"
                value={formData.cost_price_uah}
                onChange={(e) =>
                  setFormData({ ...formData, cost_price_uah: e.target.value })
                }
                inputProps={{ step: '0.01', min: '0' }}
                helperText="Введіть ціну в гривнях"
              />
            </Box>
            <TextField
              fullWidth
              label="Собівартість (застаріле поле)"
              type="number"
              value={formData.cost_price}
              onChange={(e) =>
                setFormData({ ...formData, cost_price: e.target.value })
              }
              margin="normal"
              inputProps={{ step: '0.01', min: '0' }}
              helperText="Використовується для сумісності, краще використовувати поля вище"
            />
          <FormControl fullWidth margin="normal">
            <InputLabel>Одиниця вимірювання</InputLabel>
            <Select
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
              label="Одиниця вимірювання"
            >
              <MenuItem value="шт">шт</MenuItem>
              <MenuItem value="л">л</MenuItem>
              <MenuItem value="кг">кг</MenuItem>
              <MenuItem value="т">т</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Колір картки (якщо немає зображення)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <input
                type="color"
                value={formData.card_color || '#FF6B6B'}
                onChange={(e) =>
                  setFormData({ ...formData, card_color: e.target.value })
                }
                style={{
                  width: '60px',
                  height: '40px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <TextField
                label="Колір (HEX)"
                value={formData.card_color || ''}
                onChange={(e) =>
                  setFormData({ ...formData, card_color: e.target.value })
                }
                placeholder="#FF6B6B"
                size="small"
                sx={{ flex: 1 }}
                helperText="Використовується для фону SVG картки, якщо зображення не завантажено"
              />
            </Box>
          </Box>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Зображення товару
            </Typography>
            
            {/* Preview зображення */}
            {(imagePreview || formData.image_url) && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <img
                  src={imagePreview || formData.image_url}
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '4px'
                  }}
                  onError={(e) => {
                    e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EЗображення не знайдено%3C/text%3E%3C/svg%3E`;
                  }}
                />
                {editingProduct && formData.image_url && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteForeverIcon />}
                    onClick={handleImageDelete}
                  >
                    Видалити
                  </Button>
                )}
              </Box>
            )}
            
            {/* Завантаження файлу */}
            {editingProduct && (
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleImageSelect}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploadingImage}
                    sx={{ mr: 1 }}
                  >
                    {uploadingImage ? 'Завантаження...' : 'Вибрати файл'}
                  </Button>
                </label>
                {selectedImageFile && (
                  <Button
                    variant="contained"
                    onClick={handleImageUpload}
                    disabled={uploadingImage}
                    sx={{ ml: 1 }}
                  >
                    Завантажити
                  </Button>
                )}
                {selectedImageFile && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Вибрано: {selectedImageFile.name}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* URL картинки (для ручного введення) */}
            <TextField
              fullWidth
              label="URL картинки"
              value={formData.image_url}
              onChange={(e) => {
                setFormData({ ...formData, image_url: e.target.value });
                setImagePreview(e.target.value || null);
              }}
              margin="normal"
              placeholder="https://example.com/image.jpg або залиште порожнім для placeholder"
              helperText="Можна ввести URL вручну або завантажити файл (тільки для існуючих товарів)"
            />
          </Box>
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
                      €
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

