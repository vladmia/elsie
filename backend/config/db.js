const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables
const initDb = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create users table with updated roles
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone_number VARCHAR(20) DEFAULT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('vendor', 'farmer', 'admin') DEFAULT 'vendor',
        reset_token VARCHAR(255) DEFAULT NULL,
        reset_expires DATETIME,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Check if users table exists with old schema
    const [userColumns] = await connection.query(`
      SHOW COLUMNS FROM users LIKE 'role'
    `);
    
    // If the role column exists but has the old enum values, alter it
    if (userColumns.length > 0 && userColumns[0].Type === "enum('user','admin')") {
      console.log('Updating users table schema with new roles...');
      await connection.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('vendor', 'farmer', 'admin') DEFAULT 'vendor'
      `);
      console.log('Users table updated with new roles');
    }
    
    // Check if email verification columns exist and add them if not
    const [emailVerifiedColumn] = await connection.query(`
      SHOW COLUMNS FROM users LIKE 'email_verified'
    `);
    
    if (emailVerifiedColumn.length === 0) {
      console.log('Adding email verification columns to users table...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN verification_token VARCHAR(255)
      `);
      console.log('Email verification columns added to users table');
    }
    
    // Create categories table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        status ENUM('Available', 'Sold', 'Reserved') DEFAULT 'Available',
        is_approved BOOLEAN DEFAULT FALSE,
        category_id INT,
        user_id INT NOT NULL,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Check if is_approved column exists in products table and add it if not
    const [isApprovedColumn] = await connection.query(`
      SHOW COLUMNS FROM products LIKE 'is_approved'
    `);
    
    if (isApprovedColumn.length === 0) {
      console.log('Adding is_approved column to products table...');
      await connection.query(`
        ALTER TABLE products 
        ADD COLUMN is_approved BOOLEAN DEFAULT FALSE
      `);
      console.log('is_approved column added to products table');
    }
    
    // Create orders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        total_price DECIMAL(10,2) NOT NULL,
        status ENUM('Pending', 'Processing', 'Completed', 'Cancelled') DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Database tables initialized successfully');
    connection.release();
    
    // Insert default admin user
    await pool.query(`
      INSERT IGNORE INTO users (name, email, password, role, email_verified) 
      VALUES ('Admin User', 'admin@example.com', '$2a$10$7JB720yubVSZvUIcDdBOEu0/80ProYcokLfhNLpLN4J1FD9g7wLNu', 'admin', TRUE)
    `);
    console.log('Default admin user created (email: admin@example.com, password: admin123)');
    
    // Insert default farmer user for sample products
    await pool.query(`
      INSERT IGNORE INTO users (name, email, password, role, email_verified) 
      VALUES ('Sample Farmer', 'farmer@example.com', '$2a$10$7JB720yubVSZvUIcDdBOEu0/80ProYcokLfhNLpLN4J1FD9g7wLNu', 'farmer', TRUE)
    `);
    console.log('Default farmer user created (email: farmer@example.com, password: admin123)');
    
    // Insert default categories
    await pool.query(`
      INSERT IGNORE INTO categories (name, description) 
      VALUES 
        ('Vegetables', 'Fresh vegetables from local farms'),
        ('Dairy & Eggs', 'Fresh dairy products and eggs'),
        ('Fruits', 'Fresh seasonal fruits'),
        ('Herbs', 'Fresh herbs and spices'),
        ('Meat', 'Fresh locally raised meat'),
        ('Seafood', 'Fresh caught seafood')
    `);
    console.log('Default categories created');
    
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
};

module.exports = {
  pool,
  testConnection,
  initDb
}; 