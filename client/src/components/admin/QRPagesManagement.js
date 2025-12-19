import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Link,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QrCodeIcon from '@mui/icons-material/QrCode';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api');

// Мапінг URL категорій до назв категорій
const categoryMapping = {
  'colorant': [
    'Колоранти',
    'tecsamarket.com.ua/colorant'
  ],
  'mix': [
    'Колірувальне обладнання',
    'tecsamarket.com.ua/mix'
  ],
  'bruker-o': [
    'Брукер Оптікс (БІЧ)',
    'tecsamarket.com.ua/bruker-o'
  ],
  'axs': [
    'Брукер АХС',
    'tecsamarket.com.ua/axs'
  ],
  'filter': [
    'Фільтри',
    'tecsamarket.com.ua/filter'
  ],
  'lab': [
    'Лабораторка',
    'tecsamarket.com.ua/lab'
  ]
};

const QRPagesManagement = () => {
  const [categoriesData, setCategoriesData] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [qrPageCategories, setQrPageCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedQrPage, setSelectedQrPage] = useState(null);
  const [selectedCategoryToAdd, setSelectedCategoryToAdd] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Отримуємо всі категорії
      const categoriesResponse = await axios.get(`${API_URL}/admin/categories`);
      setAllCategories(categoriesResponse.data || []);
      
      // Отримуємо призначені категорії для QR-сторінок
      const qrPagesResponse = await axios.get(`${API_URL}/admin/qr-pages`);
      setQrPageCategories(qrPagesResponse.data || {});
      
      // Отримуємо товари для кожної QR-сторінки
      await fetchQRPagesData(qrPagesResponse.data || {});
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Не вдалося завантажити дані');
      setLoading(false);
    }
  };

  const fetchQRPagesData = async (qrCategories = null) => {
    const categoriesMap = qrCategories || qrPageCategories;
    
    try {
      // Отримуємо дані для кожної QR-сторінки паралельно
      const promises = Object.keys(categoryMapping).map(async (urlKey) => {
        const [defaultCategoryName, url] = categoryMapping[urlKey];
        try {
          const response = await axios.get(`${API_URL}/greetings/${urlKey}/products`);
          const assignedCategories = categoriesMap[urlKey] || [];
          
          return {
            urlKey,
            defaultCategoryName,
            url,
            products: response.data || [],
            fullUrl: `https://${url}`,
            assignedCategories: assignedCategories.map(cat => ({
              id: cat.category_id,
              name: cat.category_name
            }))
          };
        } catch (err) {
          console.error(`Error fetching products for ${urlKey}:`, err);
          return {
            urlKey,
            defaultCategoryName,
            url,
            products: [],
            fullUrl: `https://${url}`,
            error: err.message,
            assignedCategories: []
          };
        }
      });

      const results = await Promise.all(promises);
      setCategoriesData(results);
    } catch (err) {
      console.error('Error fetching QR pages data:', err);
      setError('Не вдалося завантажити дані про QR-сторінки');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCategoryDialog = (urlKey) => {
    setSelectedQrPage(urlKey);
    setCategoryDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setSelectedQrPage(null);
    setSelectedCategoryToAdd('');
  };

  const handleAddCategory = async () => {
    if (!selectedQrPage || !selectedCategoryToAdd) return;
    
    try {
      await axios.post(`${API_URL}/admin/qr-pages/${selectedQrPage}/categories`, {
        category_id: parseInt(selectedCategoryToAdd)
      });
      
      // Оновлюємо дані
      await fetchAllData();
      handleCloseCategoryDialog();
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Помилка додавання категорії: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveCategory = async (urlKey, categoryId) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цю категорію з QR-сторінки?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/admin/qr-pages/${urlKey}/categories/${categoryId}`);
      
      // Оновлюємо дані
      await fetchAllData();
    } catch (err) {
      console.error('Error removing category:', err);
      alert('Помилка видалення категорії: ' + (err.response?.data?.error || err.message));
    }
  };

  const getAvailableCategories = () => {
    if (!selectedQrPage) return [];
    
    const assignedCategoryIds = (qrPageCategories[selectedQrPage] || []).map(cat => cat.category_id);
    return allCategories.filter(cat => !assignedCategoryIds.includes(cat.id));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <QrCodeIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4">
            QR-сторінки та товари
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAllData}
          disabled={loading}
        >
          Оновити
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Управління категоріями та перегляд товарів на кожній QR-сторінці
      </Typography>

      <Grid container spacing={3}>
        {categoriesData.map((qrPage) => (
          <Grid item xs={12} key={qrPage.urlKey}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {qrPage.url}
                  </Typography>
                  <Chip 
                    label={`${qrPage.products.length} товарів`} 
                    color="primary" 
                    size="small"
                  />
                  {qrPage.assignedCategories.length > 0 && (
                    <Chip 
                      label={`${qrPage.assignedCategories.length} категорій`} 
                      color="secondary" 
                      size="small"
                    />
                  )}
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Link 
                      href={qrPage.fullUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ fontSize: '0.875rem', mr: 1 }}
                    >
                      Відкрити сторінку
                    </Link>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCategoryDialog(qrPage.urlKey);
                      }}
                      color="primary"
                    >
                      <SettingsIcon />
                    </IconButton>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {/* Список призначених категорій */}
                {qrPage.assignedCategories.length > 0 ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Призначені категорії:
                    </Typography>
                    <List dense>
                      {qrPage.assignedCategories.map((cat) => (
                        <ListItem key={cat.id}>
                          <ListItemText primary={cat.name} />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveCategory(qrPage.urlKey, cat.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    На цій QR-сторінці не призначено жодної категорії. Використовується дефолтна категорія.
                  </Alert>
                )}

                {/* Товари */}
                {qrPage.error ? (
                  <Alert severity="warning">
                    Помилка завантаження товарів: {qrPage.error}
                  </Alert>
                ) : qrPage.products.length === 0 ? (
                  <Alert severity="info">
                    На цій QR-сторінці поки немає товарів
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Назва товару</TableCell>
                          <TableCell>Категорія</TableCell>
                          <TableCell>Зображення</TableCell>
                          <TableCell>Колір картки</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {qrPage.products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.id}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {product.name}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={product.category_name} 
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {product.image_url ? (
                                <Chip 
                                  label="Є зображення" 
                                  color="success" 
                                  size="small"
                                />
                              ) : (
                                <Chip 
                                  label="SVG" 
                                  color="default" 
                                  size="small"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {product.card_color ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '4px',
                                      backgroundColor: product.card_color,
                                      border: '1px solid #ccc'
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                    {product.card_color}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  Автоматичний
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        ))}
      </Grid>

      {/* Діалог додавання категорії */}
      <Dialog open={categoryDialogOpen} onClose={handleCloseCategoryDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Додати категорію до QR-сторінки
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Категорія</InputLabel>
              <Select
                value={selectedCategoryToAdd}
                onChange={(e) => setSelectedCategoryToAdd(e.target.value)}
                label="Категорія"
              >
                {getAvailableCategories().map((cat) => (
                  <MenuItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {getAvailableCategories().length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Всі категорії вже призначені до цієї QR-сторінки
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>Скасувати</Button>
          <Button 
            onClick={handleAddCategory} 
            variant="contained"
            disabled={!selectedCategoryToAdd}
            startIcon={<AddIcon />}
          >
            Додати
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QRPagesManagement;
