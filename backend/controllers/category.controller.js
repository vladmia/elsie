const { pool } = require('../config/db');

// @desc    Get all categories
// @route   GET /category
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create category
// @route   POST /category
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category name'
      });
    }
    
    // Check if category already exists
    const [existingCategory] = await pool.query(
      'SELECT * FROM categories WHERE name = ?',
      [name]
    );
    
    if (existingCategory.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }
    
    // Create category
    const [result] = await pool.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    
    // Get created category
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      data: categories[0]
    });
    
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update category
// @route   PUT /category/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category name'
      });
    }
    
    // Check if category exists
    const [existingCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    
    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Update category
    await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || '', id]
    );
    
    // Get updated category
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    
    res.status(200).json({
      success: true,
      data: categories[0]
    });
    
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete category
// @route   DELETE /category/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const [existingCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    
    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if category is being used in products
    const [products] = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );
    
    if (products[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category cannot be deleted because it is being used by products'
      });
    }
    
    // Delete category
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 