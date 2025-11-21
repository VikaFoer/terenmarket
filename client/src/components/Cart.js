import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Divider,
  TextField,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Badge from '@mui/material/Badge';

const Cart = ({ open, onClose, cartItems, onUpdateQuantity, onRemoveItem, onClearCart }) => {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Корзина
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {cartItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <ShoppingCartIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Корзина порожня
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
              <List sx={{ p: 0 }}>
                {cartItems.map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      mb: { xs: 1.5, sm: 2 },
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      p: { xs: 1.5, sm: 2 },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          pr: 1,
                        }}
                      >
                        {item.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => onRemoveItem(item.id)}
                        color="error"
                        sx={{ flexShrink: 0 }}
                      >
                        <DeleteIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          mb: 0.5,
                        }}
                      >
                        {item.cost_price_eur ? `${item.cost_price_eur.toFixed(2)} €` : (item.cost_price ? `${item.cost_price.toFixed(2)} €` : '')} за од.
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                        }}
                      >
                        {item.price.toFixed(2)} грн за од.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, width: '100%', flexWrap: 'wrap' }}>
                      <Typography 
                        variant="body2"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                      >
                        Кількість:
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                          onUpdateQuantity(item.id, newQuantity);
                        }}
                        inputProps={{ 
                          min: 1, 
                          style: { 
                            width: '50px', 
                            textAlign: 'center',
                            fontSize: '0.875rem',
                          } 
                        }}
                        sx={{ width: { xs: 70, sm: 80 } }}
                      />
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          ml: 'auto', 
                          fontWeight: 600,
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                        }}
                      >
                        {(item.price * item.quantity).toFixed(2)} грн
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>

            <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />

            <Paper sx={{ p: { xs: 1.5, sm: 2 }, backgroundColor: '#f8f9fa', position: 'sticky', bottom: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography 
                  variant="h6"
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  Всього:
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'primary.main',
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                  }}
                >
                  {total.toFixed(2)} грн
                </Typography>
              </Box>
              <Button
                variant="contained"
                fullWidth
                sx={{ 
                  mb: 1,
                  py: { xs: 1.25, sm: 1 },
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                }}
                disabled={cartItems.length === 0}
              >
                Оформити замовлення
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={onClearCart}
                disabled={cartItems.length === 0}
                sx={{
                  py: { xs: 1.25, sm: 1 },
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                }}
              >
                Очистити корзину
              </Button>
            </Paper>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default Cart;

