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
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <ShoppingCartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              Корзина порожня
            </Typography>
          </Box>
        ) : (
          <>
            <List>
              {cartItems.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    mb: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => onRemoveItem(item.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {item.price.toFixed(2)} грн за од.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="body2">Кількість:</Typography>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                        onUpdateQuantity(item.id, newQuantity);
                      }}
                      inputProps={{ min: 1, style: { width: '60px', textAlign: 'center' } }}
                      sx={{ width: 80 }}
                    />
                    <Typography variant="body1" sx={{ ml: 'auto', fontWeight: 600 }}>
                      {(item.price * item.quantity).toFixed(2)} грн
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Paper sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Всього:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {total.toFixed(2)} грн
                </Typography>
              </Box>
              <Button
                variant="contained"
                fullWidth
                sx={{ mb: 1 }}
                disabled={cartItems.length === 0}
              >
                Оформити замовлення
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={onClearCart}
                disabled={cartItems.length === 0}
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

