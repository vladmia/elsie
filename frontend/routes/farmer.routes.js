const express = require('express');
const router = express.Router();
const axios = require('axios');
const { isLoggedIn, isFarmer } = require('../middleware/auth');

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Farmer middleware for all farmer routes
router.use(isLoggedIn, isFarmer);

// Farmer dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch farmer's products
    const productResponse = await axios.get(`${API_URL}/farm/my-products`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    // Fetch recent orders for the dashboard
    let orders = [];
    try {
      const orderResponse = await axios.get(`${API_URL}/order/farmer/orders`, {
        headers: {
          Authorization: `Bearer ${req.session.token}`
        }
      });
      orders = orderResponse.data.data || [];
    } catch (orderError) {
      console.error('Error fetching orders for dashboard:', orderError.message);
    }
    
    const products = productResponse.data.data || [];
    
    res.render('farmer/dashboard', { 
      title: 'Farmer Dashboard',
      user: req.session.user,
      products,
      orders: orders.slice(0, 5), // Show only 5 most recent orders
      activeLink: 'dashboard'
    });
  } catch (error) {
    console.error('Farmer dashboard error:', error.message);
    req.flash('error_msg', 'Failed to load dashboard data');
    res.render('farmer/dashboard', {
      title: 'Farmer Dashboard',
      user: req.session.user,
      products: [],
      orders: [],
      activeLink: 'dashboard'
    });
  }
});

// Product management
router.get('/products', async (req, res) => {
  try {
    // Fetch farmer's products
    const productResponse = await axios.get(`${API_URL}/farm/my-products`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    // Fetch categories for product creation/editing
    const categoryResponse = await axios.get(`${API_URL}/category`);
    
    const products = productResponse.data.data || [];
    const categories = categoryResponse.data.data || [];
    
    res.render('farmer/products', { 
      title: 'My Products',
      user: req.session.user,
      products,
      categories,
      activeLink: 'products'
    });
  } catch (error) {
    console.error('Farmer products error:', error.message);
    req.flash('error_msg', 'Failed to load products');
    res.render('farmer/products', { 
      title: 'My Products',
      user: req.session.user,
      products: [],
      categories: [],
      activeLink: 'products'
    });
  }
});

// Orders management
router.get('/orders', async (req, res) => {
  try {
    // Fetch orders for farmer's products
    const orderResponse = await axios.get(`${API_URL}/order/farmer/orders`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    const orders = orderResponse.data.data || [];
    
    res.render('farmer/orders', { 
      title: 'Orders',
      user: req.session.user,
      orders,
      activeLink: 'orders'
    });
  } catch (error) {
    console.error('Farmer orders error:', error.message);
    req.flash('error_msg', 'Failed to load orders');
    res.render('farmer/orders', { 
      title: 'Orders',
      user: req.session.user,
      orders: [],
      activeLink: 'orders'
    });
  }
});

// Order details
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch specific order details
    const orderResponse = await axios.get(`${API_URL}/order/farmer/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    const order = orderResponse.data.data;
    
    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/farmer/orders');
    }
    
    res.render('farmer/order-details', { 
      title: `Order #${order.id}`,
      user: req.session.user,
      order,
      activeLink: 'orders'
    });
  } catch (error) {
    console.error('Order details error:', error.message);
    req.flash('error_msg', 'Failed to load order details');
    res.redirect('/farmer/orders');
  }
});

// Update order status
router.post('/orders/:id/update-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      req.flash('error_msg', 'Status is required');
      return res.redirect(`/farmer/orders/${id}`);
    }
    
    // Update order status
    await axios.patch(`${API_URL}/order/farmer/update-status/${id}`, 
      { status }, 
      {
        headers: {
          Authorization: `Bearer ${req.session.token}`
        }
      }
    );
    
    req.flash('success_msg', 'Order status updated successfully');
    res.redirect(`/farmer/orders/${id}`);
  } catch (error) {
    console.error('Update order status error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to update order status');
    res.redirect(`/farmer/orders/${id}`);
  }
});

// Add new product page
router.get('/products/add', async (req, res) => {
  try {
    // Fetch categories for product creation
    const categoryResponse = await axios.get(`${API_URL}/category`);
    const categories = categoryResponse.data.data || [];
    
    res.render('farmer/add-product', { 
      title: 'Add New Product',
      user: req.session.user,
      categories,
      activeLink: 'products'
    });
  } catch (error) {
    console.error('Add product page error:', error.message);
    req.flash('error_msg', 'Failed to load categories');
    res.redirect('/farmer/products');
  }
});

// Create new product
router.post('/products', async (req, res) => {
  try {
    const { title, description, price, quantity, category, image_url } = req.body;
    
    if (!title || !price || !quantity || !category) {
      req.flash('error_msg', 'Please provide all required fields');
      return res.redirect('/farmer/products/add');
    }
    
    // Create product
    await axios.post(`${API_URL}/farm`, { 
      title, 
      description, 
      price, 
      quantity, 
      category,
      image_url 
    }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Product created successfully');
    res.redirect('/farmer/products');
  } catch (error) {
    console.error('Create product error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to create product');
    res.redirect('/farmer/products/add');
  }
});

// Edit product page
router.get('/products/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch product details
    const productResponse = await axios.get(`${API_URL}/farm/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    // Fetch categories
    const categoryResponse = await axios.get(`${API_URL}/category`);
    
    const product = productResponse.data.data;
    const categories = categoryResponse.data.data || [];
    
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/farmer/products');
    }
    
    res.render('farmer/edit-product', { 
      title: 'Edit Product',
      user: req.session.user,
      product,
      categories,
      activeLink: 'products'
    });
  } catch (error) {
    console.error('Edit product page error:', error.message);
    req.flash('error_msg', 'Failed to load product');
    res.redirect('/farmer/products');
  }
});

// Update product
router.post('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, quantity, status, category, image_url } = req.body;
    
    // Update product
    await axios.patch(`${API_URL}/farm/${id}`, { 
      title, 
      description, 
      price, 
      quantity, 
      status, 
      category,
      image_url
    }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Product updated successfully');
    res.redirect('/farmer/products');
  } catch (error) {
    console.error('Update product error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to update product');
    res.redirect(`/farmer/products/edit/${req.params.id}`);
  }
});

// Delete product
router.post('/products/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete product
    await axios.delete(`${API_URL}/farm/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Product deleted successfully');
    res.redirect('/farmer/products');
  } catch (error) {
    console.error('Delete product error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to delete product');
    res.redirect('/farmer/products');
  }
});

module.exports = router; 