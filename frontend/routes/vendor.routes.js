const express = require('express');
const router = express.Router();
const axios = require('axios');
const { isLoggedIn, isVendor } = require('../middleware/auth');

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Vendor middleware for all vendor routes
router.use(isLoggedIn, isVendor);

// Vendor dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch vendor's orders
    const orderResponse = await axios.get(`${API_URL}/order/my-orders`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    const orders = orderResponse.data.data || [];
    
    res.render('vendor/dashboard', { 
      title: 'Vendor Dashboard',
      user: req.session.user,
      orders,
      activeLink: 'dashboard'
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error.message);
    req.flash('error_msg', 'Failed to load dashboard data');
    res.render('vendor/dashboard', {
      title: 'Vendor Dashboard',
      user: req.session.user,
      orders: [],
      activeLink: 'dashboard'
    });
  }
});

// View all orders
router.get('/orders', async (req, res) => {
  try {
    // Fetch vendor's orders
    const response = await axios.get(`${API_URL}/order/my-orders`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    const orders = response.data.data || [];
    
    res.render('vendor/orders', { 
      title: 'My Orders',
      user: req.session.user,
      orders,
      activeLink: 'orders'
    });
  } catch (error) {
    console.error('Vendor orders error:', error.message);
    req.flash('error_msg', 'Failed to load orders');
    res.render('vendor/orders', { 
      title: 'My Orders',
      user: req.session.user,
      orders: [],
      activeLink: 'orders'
    });
  }
});

// View single order
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch order details
    const response = await axios.get(`${API_URL}/order/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    const order = response.data.data;
    
    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/vendor/orders');
    }
    
    res.render('vendor/order-details', { 
      title: `Order #${order.id}`,
      user: req.session.user,
      order,
      activeLink: 'orders'
    });
  } catch (error) {
    console.error('Order details error:', error.message);
    req.flash('error_msg', 'Failed to load order details');
    res.redirect('/vendor/orders');
  }
});

// Place new order
router.post('/orders', async (req, res) => {
  try {
    const { productId, quantity, notes } = req.body;
    
    if (!productId || !quantity) {
      req.flash('error_msg', 'Please provide product and quantity');
      return res.redirect('/marketplace');
    }
    
    // Create order
    await axios.post(`${API_URL}/order/order`, { 
      productId, 
      quantity, 
      notes 
    }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Order placed successfully');
    res.redirect('/vendor/orders');
  } catch (error) {
    console.error('Create order error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to place order');
    res.redirect('/marketplace');
  }
});

// Update order
router.post('/orders/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, notes } = req.body;
    
    // Update order
    await axios.patch(`${API_URL}/order/update/${id}`, { 
      quantity, 
      notes 
    }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Order updated successfully');
    res.redirect(`/vendor/orders/${id}`);
  } catch (error) {
    console.error('Update order error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to update order');
    res.redirect(`/vendor/orders/${id}`);
  }
});

// Cancel order
router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cancel order
    await axios.delete(`${API_URL}/order/cancel/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Order cancelled successfully');
    res.redirect('/vendor/orders');
  } catch (error) {
    console.error('Cancel order error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to cancel order');
    res.redirect(`/vendor/orders/${id}`);
  }
});

module.exports = router; 