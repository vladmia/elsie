const { pool } = require('../config/db');

// @desc    Create a new order
// @route   POST /order/order
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { productId, quantity, notes } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product ID and quantity'
      });
    }
    
    // Check if product exists and is available
    const [products] = await pool.query(
      'SELECT * FROM products WHERE id = ? AND status = "Available"',
      [productId]
    );
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }
    
    const product = products[0];
    
    // Check if requested quantity is available
    if (quantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.quantity} units available`
      });
    }
    
    // Calculate total price
    const totalPrice = product.price * quantity;
    
    // Create order
    const [result] = await pool.query(
      'INSERT INTO orders (product_id, user_id, quantity, total_price, notes, status) VALUES (?, ?, ?, ?, ?, "Pending")',
      [productId, req.user.id, quantity, totalPrice, notes || '']
    );
    
    // Update product quantity
    await pool.query(
      'UPDATE products SET quantity = quantity - ? WHERE id = ?',
      [quantity, productId]
    );
    
    // If product is now out of stock, mark as sold
    await pool.query(
      'UPDATE products SET status = "Sold" WHERE id = ? AND quantity = 0',
      [productId]
    );
    
    // Get created order with product details
    const [orders] = await pool.query(`
      SELECT o.*, p.title as product_title, p.price as product_price
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      data: orders[0]
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update an order
// @route   PATCH /order/update/:id
// @access  Private
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, notes } = req.body;
    
    // Check if order exists and belongs to user
    const [orders] = await pool.query(
      'SELECT o.*, p.quantity as product_available, p.price FROM orders o JOIN products p ON o.product_id = p.id WHERE o.id = ? AND o.user_id = ?',
      [id, req.user.id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not authorized'
      });
    }
    
    const order = orders[0];
    
    // Only allow updates if order is still pending
    if (order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update order that is not pending'
      });
    }
    
    let newQuantity = order.quantity;
    let newTotalPrice = order.total_price;
    
    // If quantity is being updated
    if (quantity && quantity !== order.quantity) {
      // Calculate available quantity (current product available + current order quantity)
      const availableQuantity = order.product_available + order.quantity;
      
      if (quantity > availableQuantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${availableQuantity} units available`
        });
      }
      
      newQuantity = quantity;
      newTotalPrice = order.price * quantity;
      
      // Update product quantity
      await pool.query(
        'UPDATE products SET quantity = quantity + ? - ? WHERE id = ?',
        [order.quantity, quantity, order.product_id]
      );
      
      // Update product status based on new quantity
      await pool.query(
        'UPDATE products SET status = CASE WHEN quantity = 0 THEN "Sold" ELSE "Available" END WHERE id = ?',
        [order.product_id]
      );
    }
    
    // Update order
    await pool.query(
      'UPDATE orders SET quantity = ?, total_price = ?, notes = ? WHERE id = ?',
      [newQuantity, newTotalPrice, notes || order.notes, id]
    );
    
    // Get updated order
    const [updatedOrders] = await pool.query(`
      SELECT o.*, p.title as product_title
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `, [id]);
    
    res.status(200).json({
      success: true,
      data: updatedOrders[0]
    });
    
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel an order
// @route   DELETE /order/cancel/:id
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if order exists and belongs to user
    const [orders] = await pool.query(
      'SELECT o.*, p.id as product_id FROM orders o JOIN products p ON o.product_id = p.id WHERE o.id = ? AND o.user_id = ?',
      [id, req.user.id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not authorized'
      });
    }
    
    const order = orders[0];
    
    // Only allow cancellation if order is still pending
    if (order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that is not pending'
      });
    }
    
    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update order status to Cancelled
      await connection.query(
        'UPDATE orders SET status = "Cancelled" WHERE id = ?',
        [id]
      );
      
      // Return quantity to product
      await connection.query(
        'UPDATE products SET quantity = quantity + ?, status = "Available" WHERE id = ?',
        [order.quantity, order.product_id]
      );
      
      await connection.commit();
      
      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's orders
// @route   GET /order/my-orders
// @access  Private
exports.getUserOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.*, p.title as product_title, p.price as product_price, u.name as vendor_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
    
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single order
// @route   GET /order/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if order exists and belongs to user (or user is admin)
    let query = `
      SELECT o.*, p.title as product_title, p.price as product_price, 
             u.name as vendor_name, c.name as category_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.id = ?
    `;
    
    let params = [id];
    
    if (req.user.role !== 'admin') {
      query += ' AND o.user_id = ?';
      params.push(req.user.id);
    }
    
    const [orders] = await pool.query(query, params);
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not authorized'
      });
    }
    
    res.status(200).json({
      success: true,
      data: orders[0]
    });
    
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 

// @desc    Get orders for farmer's products
// @route   GET /order/farmer-orders
// @access  Private/Farmer
exports.getFarmerOrders = async (req, res) => {
  try {
    // Get orders for products created by this farmer
    const [orders] = await pool.query(`
      SELECT o.*, p.title as product_title, p.price as product_price, 
             u.name as customer_name, u.email as customer_email,
             c.name as category_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
    
  } catch (error) {
    console.error('Get farmer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get specific order for farmer
// @route   GET /order/farmer/:id
// @access  Private/Farmer
exports.getFarmerOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if order exists and is for a product by this farmer
    const [orders] = await pool.query(`
      SELECT o.*, p.title as product_title, p.price as product_price, 
             u.name as customer_name, u.email as customer_email,
             c.name as category_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.id = ? AND p.user_id = ?
    `, [id, req.user.id]);
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not authorized'
      });
    }
    
    res.status(200).json({
      success: true,
      data: orders[0]
    });
    
  } catch (error) {
    console.error('Get farmer order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update order status (for farmer)
// @route   PATCH /order/update-status/:id
// @access  Private/Farmer
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['Pending', 'Processing', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }
    
    // Check if order exists and belongs to one of farmer's products
    const [orders] = await pool.query(`
      SELECT o.* 
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ? AND p.user_id = ?
    `, [id, req.user.id]);
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not authorized'
      });
    }
    
    const order = orders[0];
    
    // If cancelling, return quantity to product
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      // Begin transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Update order status
        await connection.query(
          'UPDATE orders SET status = ? WHERE id = ?',
          [status, id]
        );
        
        // Return quantity to product
        await connection.query(
          'UPDATE products SET quantity = quantity + ? WHERE id = ?',
          [order.quantity, order.product_id]
        );
        
        // Update product status to Available if it was Sold
        await connection.query(
          'UPDATE products SET status = "Available" WHERE id = ? AND status = "Sold"',
          [order.product_id]
        );
        
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      // Just update the status
      await pool.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, id]
      );
    }
    
    // Get updated order
    const [updatedOrders] = await pool.query(`
      SELECT o.*, p.title as product_title, p.price as product_price,
             u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [id]);
    
    res.status(200).json({
      success: true,
      data: updatedOrders[0]
    });
    
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 