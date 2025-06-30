const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, './config/config.env') });

// Create database connection
const createConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'elsie_db'
  });
};

// Sample products
const products = [
  {
    title: 'Fresh Organic Tomatoes',
    description: 'Locally grown organic tomatoes, perfect for salads and sauces.',
    price: 3.99,
    quantity: 50,
    category_id: 1, // Vegetables
    user_id: 2, // Sample Farmer user ID
    status: 'Available'
  },
  {
    title: 'Free Range Eggs',
    description: 'Farm fresh free-range eggs from happy chickens.',
    price: 4.50,
    quantity: 30,
    category_id: 2, // Dairy & Eggs
    user_id: 2, // Sample Farmer user ID
    status: 'Available'
  },
  {
    title: 'Organic Apples',
    description: 'Sweet and crunchy apples grown without pesticides.',
    price: 2.99,
    quantity: 100,
    category_id: 3, // Fruits
    user_id: 2, // Sample Farmer user ID
    status: 'Available'
  },
  {
    title: 'Fresh Mint Bundle',
    description: 'Aromatic mint leaves, perfect for tea and cooking.',
    price: 1.99,
    quantity: 25,
    category_id: 4, // Herbs
    user_id: 2, // Sample Farmer user ID
    status: 'Available'
  },
  {
    title: 'Grass-Fed Ground Beef',
    description: 'Premium grass-fed beef from local pastures.',
    price: 9.99,
    quantity: 15,
    category_id: 5, // Meat
    user_id: 2, // Sample Farmer user ID
    status: 'Available'
  },
  {
    title: 'Wild Caught Salmon',
    description: 'Fresh wild caught salmon, rich in omega-3.',
    price: 14.99,
    quantity: 10,
    category_id: 6, // Seafood
    user_id: 2, // Sample Farmer user ID
    status: 'Available'
  }
];

// Sample categories if none exist
const categories = [
  { name: 'Vegetables', description: 'Fresh farm vegetables' },
  { name: 'Dairy & Eggs', description: 'Fresh dairy products and eggs' },
  { name: 'Fruits', description: 'Fresh seasonal fruits' },
  { name: 'Herbs', description: 'Fresh herbs and spices' },
  { name: 'Meat', description: 'Fresh locally raised meat' },
  { name: 'Seafood', description: 'Fresh caught seafood' }
];

// Insert sample data
const insertSampleData = async () => {
  try {
    const conn = await createConnection();
    console.log('Connected to the database');

    // Check if categories exist
    const [existingCategories] = await conn.query('SELECT * FROM categories');
    
    // Insert categories if none exist
    if (existingCategories.length === 0) {
      console.log('Adding sample categories...');
      for (const category of categories) {
        await conn.query(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [category.name, category.description]
        );
      }
      console.log('Sample categories added');
    } else {
      console.log(`Found ${existingCategories.length} existing categories`);
    }

    // Check if products exist
    const [existingProducts] = await conn.query('SELECT * FROM products');
    
    // Insert products if none exist
    if (existingProducts.length === 0) {
      console.log('Adding sample products...');
      for (const product of products) {
        await conn.query(
          'INSERT INTO products (title, description, price, quantity, category_id, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [product.title, product.description, product.price, product.quantity, product.category_id, product.user_id, product.status]
        );
      }
      console.log('Sample products added');
    } else {
      console.log(`Found ${existingProducts.length} existing products`);
    }

    await conn.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the script
insertSampleData(); 