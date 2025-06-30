const express = require('express');
const router = express.Router();
const axios = require('axios');

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Home page
router.get('/', async (req, res) => {
  try {
    // Fetch public products for home page
    const response = await axios.get(`${API_URL}/farm/public`);
    const products = response.data.data || [];
    
    res.render('public/home', { 
      title: 'FreshLink - Home',
      products: products.slice(0, 6) // Show only first 6 products on homepage
    });
  } catch (error) {
    console.error('Home page error:', error.message);
    res.render('public/home', { 
      title: 'FreshLink - Home',
      products: []
    });
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('public/about', { 
    title: 'About Us'
  });
});

// Marketplace page
router.get('/marketplace', async (req, res) => {
  try {
    // Fetch categories
    const categoryResponse = await axios.get(`${API_URL}/category`);
    const categories = categoryResponse.data.data || [];
    
    // Fetch public products
    const productResponse = await axios.get(`${API_URL}/farm/public`);
    const products = productResponse.data.data || [];
    
    // Filter by category if provided
    const { category } = req.query;
    const filteredProducts = category 
      ? products.filter(p => p.category_id.toString() === category)
      : products;
    
    res.render('public/marketplace', { 
      title: 'Marketplace',
      products: filteredProducts,
      categories,
      selectedCategory: category
    });
  } catch (error) {
    console.error('Marketplace error:', error.message);
    res.render('public/marketplace', { 
      title: 'Marketplace',
      products: [],
      categories: [],
      selectedCategory: null
    });
  }
});

// Product details page
router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch product details
    const response = await axios.get(`${API_URL}/farm/${id}`);
    const product = response.data.data;
    
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/marketplace');
    }
    
    res.render('public/product-details', { 
      title: product.title,
      product
    });
  } catch (error) {
    console.error('Product details error:', error.message);
    req.flash('error_msg', 'Product not found');
    res.redirect('/marketplace');
  }
});

// Services page
router.get('/services', (req, res) => {
  res.render('public/services', { 
    title: 'Our Services'
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('public/contact', { 
    title: 'Contact Us'
  });
});

module.exports = router; 