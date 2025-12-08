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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QrCodeIcon from '@mui/icons-material/QrCode';
import RefreshIcon from '@mui/icons-material/Refresh';
import Button from '@mui/material/Button';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQRPagesData();
  }, []);

  const fetchQRPagesData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Отримуємо дані для кожної категорії паралельно
      const promises = Object.keys(categoryMapping).map(async (urlKey) => {
        const [categoryName, url] = categoryMapping[urlKey];
        try {
          const response = await axios.get(`${API_URL}/greetings/${urlKey}/products`);
          return {
            urlKey,
            categoryName,
            url,
            products: response.data || [],
            fullUrl: `https://${url}`
          };
        } catch (err) {
          console.error(`Error fetching products for ${urlKey}:`, err);
          return {
            urlKey,
            categoryName,
            url,
            products: [],
            fullUrl: `https://${url}`,
            error: err.message
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
          onClick={fetchQRPagesData}
          disabled={loading}
        >
          Оновити
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Перегляд товарів, які відображаються на кожній QR-сторінці
      </Typography>

      <Grid container spacing={3}>
        {categoriesData.map((category) => (
          <Grid item xs={12} key={category.urlKey}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {category.categoryName}
                  </Typography>
                  <Chip 
                    label={`${category.products.length} товарів`} 
                    color="primary" 
                    size="small"
                  />
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Link 
                      href={category.fullUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ fontSize: '0.875rem' }}
                    >
                      {category.url}
                    </Link>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {category.error ? (
                  <Alert severity="warning">
                    Помилка завантаження товарів: {category.error}
                  </Alert>
                ) : category.products.length === 0 ? (
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
                          <TableCell>Зображення</TableCell>
                          <TableCell>Колір картки</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {category.products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.id}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {product.name}
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
      </Box>
    );
  };

export default QRPagesManagement;

