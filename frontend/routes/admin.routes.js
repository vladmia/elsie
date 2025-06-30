const express = require('express');
const router = express.Router();
const axios = require('axios');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Admin middleware for all admin routes
router.use(isLoggedIn, isAdmin);

// Admin dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Fetch all products for admin
    const productResponse = await axios.get(`${API_URL}/farm/admin-products`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    const products = productResponse.data.data || [];
    
    res.render('admin/dashboard', { 
      title: 'Admin Dashboard',
      user: req.session.user,
      products,
      activeLink: 'dashboard'
    });
  } catch (error) {
    console.error('Admin dashboard error:', error.message);
    req.flash('error_msg', 'Failed to load dashboard data');
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      products: [],
      activeLink: 'dashboard'
    });
  }
});

// Category management page
router.get('/categories', async (req, res) => {
  try {
    // Fetch all categories
    const response = await axios.get(`${API_URL}/category`);
    const categories = response.data.data || [];
    
    res.render('admin/categories', { 
      title: 'Category Management',
      user: req.session.user,
      categories,
      activeLink: 'categories'
    });
  } catch (error) {
    console.error('Admin categories error:', error.message);
    req.flash('error_msg', 'Failed to load categories');
    res.render('admin/categories', { 
      title: 'Category Management',
      user: req.session.user,
      categories: [],
      activeLink: 'categories'
    });
  }
});

// Create new category
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      req.flash('error_msg', 'Category name is required');
      return res.redirect('/admin/categories');
    }
    
    // Create category
    await axios.post(`${API_URL}/category`, { name, description }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Category created successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Create category error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to create category');
    res.redirect('/admin/categories');
  }
});

// Update category
router.post('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      req.flash('error_msg', 'Category name is required');
      return res.redirect('/admin/categories');
    }
    
    // Update category
    await axios.put(`${API_URL}/category/${id}`, { name, description }, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Category updated successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Update category error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to update category');
    res.redirect('/admin/categories');
  }
});

// Delete category
router.post('/categories/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete category
    await axios.delete(`${API_URL}/category/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    req.flash('success_msg', 'Category deleted successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Delete category error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to delete category');
    res.redirect('/admin/categories');
  }
});

// View all products with optional filtering
router.get('/products', async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    
    // Fetch all products for admin
    const productResponse = await axios.get(`${API_URL}/farm/admin-products`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    let products = productResponse.data.data || [];
    
    // Apply filtering based on approval status
    if (filter === 'pending') {
      products = products.filter(product => !product.is_approved);
    } else if (filter === 'approved') {
      products = products.filter(product => product.is_approved);
    }
    
    res.render('admin/products', { 
      title: 'Product Management',
      user: req.session.user,
      products,
      filter,
      activeLink: 'products'
    });
  } catch (error) {
    console.error('Admin products error:', error.message);
    req.flash('error_msg', 'Failed to load products');
    res.render('admin/products', { 
      title: 'Product Management',
      user: req.session.user,
      products: [],
      filter: req.query.filter || 'all',
      activeLink: 'products'
    });
  }
});

// View single product details
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch product details
    const productResponse = await axios.get(`${API_URL}/farm/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    const product = productResponse.data.data;
    
    res.render('admin/product-detail', { 
      title: `Product: ${product.title}`,
      user: req.session.user,
      product,
      activeLink: 'products'
    });
  } catch (error) {
    console.error('Product detail error:', error.response?.data || error.message);
    req.flash('error_msg', 'Failed to load product details');
    res.render('admin/product-detail', { 
      title: 'Product Details',
      user: req.session.user,
      product: null,
      activeLink: 'products'
    });
  }
});

// API route to approve/reject products
router.post('/api/farm/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    // Call backend API to approve/reject product
    const response = await axios.patch(`${API_URL}/farm/${id}/approve`, 
      { approved }, 
      {
        headers: {
          Authorization: `Bearer ${req.session.token}`
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Product approval error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to update product approval status'
    });
  }
});

// API route to delete products
router.delete('/api/farm/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Call backend API to delete product
    const response = await axios.delete(`${API_URL}/farm/${id}`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Product deletion error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to delete product'
    });
  }
});

module.exports = router; 