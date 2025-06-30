const { pool } = require('../config/db');
const { getImageFromPexels } = require('../utils/pexels');

// @desc    Get product by ID
// @route   GET /farm/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, u.name as farmer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: products[0]
    });
    
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all products (admin only)
// @route   GET /farm/admin-products
// @access  Private/Admin
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, u.name as farmer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
    
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get farmer's products
// @route   GET /farm/my-products
// @access  Private
exports.getMyProducts = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
    
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get public products (available and approved only)
// @route   GET /farm/public
// @access  Public
exports.getPublicProducts = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, u.name as farmer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.status = 'Available' AND p.is_approved = TRUE
      ORDER BY p.created_at DESC
    `);
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
    
  } catch (error) {
    console.error('Get public products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create a product
// @route   POST /farm
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, quantity, category, image_url } = req.body;
    
    // Validate required fields
    if (!title || !price || !quantity || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, price, quantity and category'
      });
    }
    
    // If no image URL provided, try to get one from Pexels
    let productImageUrl = image_url;
    if (!productImageUrl) {
      // Use description if available, otherwise use title for better image search
      const searchQuery = description && description.length > 10 ? description : title;
      productImageUrl = await getImageFromPexels(searchQuery);
    }
    
    // Insert product (set is_approved to false by default)
    const [result] = await pool.query(`
      INSERT INTO products (title, description, price, quantity, category_id, user_id, status, is_approved, image_url)
      VALUES (?, ?, ?, ?, ?, ?, 'Available', FALSE, ?)
    `, [title, description || '', price, quantity, category, req.user.id, productImageUrl]);
    
    // Get the created product
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully. It will be visible in the marketplace after admin approval.',
      data: products[0]
    });
    
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update a product
// @route   PATCH /farm/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, quantity, status, category, image_url } = req.body;
    
    // Check if product exists and belongs to user (unless admin)
    let query = 'SELECT * FROM products WHERE id = ?';
    let params = [id];
    
    if (req.user.role !== 'admin') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    const [products] = await pool.query(query, params);
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not authorized'
      });
    }
    
    // If image_url is not provided and title/description changed, try to get a new image
    let productImageUrl = image_url;
    if (!productImageUrl && (title || description)) {
      const searchQuery = description ? description : title || products[0].title;
      productImageUrl = await getImageFromPexels(searchQuery);
    }
    
    // Build update query dynamically
    let updateQuery = 'UPDATE products SET ';
    const updateParams = [];
    
    if (title) {
      updateQuery += 'title = ?, ';
      updateParams.push(title);
    }
    
    if (description !== undefined) {
      updateQuery += 'description = ?, ';
      updateParams.push(description);
    }
    
    if (price) {
      updateQuery += 'price = ?, ';
      updateParams.push(price);
    }
    
    if (quantity !== undefined) {
      updateQuery += 'quantity = ?, ';
      updateParams.push(quantity);
    }
    
    if (status) {
      updateQuery += 'status = ?, ';
      updateParams.push(status);
    }
    
    if (category) {
      updateQuery += 'category_id = ?, ';
      updateParams.push(category);
    }
    
    if (productImageUrl) {
      updateQuery += 'image_url = ?, ';
      updateParams.push(productImageUrl);
    }
    
    // If not admin, set is_approved to false when updating product
    if (req.user.role !== 'admin') {
      updateQuery += 'is_approved = FALSE, ';
    }
    
    // Remove trailing comma and space
    updateQuery = updateQuery.slice(0, -2);
    
    updateQuery += ' WHERE id = ?';
    updateParams.push(id);
    
    // Execute update
    await pool.query(updateQuery, updateParams);
    
    // Get updated product
    const [updatedProducts] = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);
    
    let message = 'Product updated successfully';
    if (req.user.role !== 'admin') {
      message += '. Your changes will be reviewed by an admin before appearing in the marketplace.';
    }
    
    res.status(200).json({
      success: true,
      message: message,
      data: updatedProducts[0]
    });
    
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete a product
// @route   DELETE /farm/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists and belongs to user (unless admin)
    let query = 'SELECT * FROM products WHERE id = ?';
    let params = [id];
    
    if (req.user.role !== 'admin') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    const [products] = await pool.query(query, params);
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not authorized'
      });
    }
    
    // Delete product
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve or reject a product (admin only)
// @route   PATCH /farm/:id/approve
// @access  Private/Admin
exports.approveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    // Validate input
    if (approved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please specify whether to approve or reject the product'
      });
    }
    
    // Check if product exists
    const [products] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Update product approval status
    await pool.query(
      'UPDATE products SET is_approved = ? WHERE id = ?',
      [approved, id]
    );
    
    // Get updated product
    const [updatedProducts] = await pool.query(`
      SELECT p.*, c.name as category_name, u.name as farmer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [id]);
    
    const message = approved ? 'Product approved successfully' : 'Product rejected successfully';
    
    res.status(200).json({
      success: true,
      message: message,
      data: updatedProducts[0]
    });
    
  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 