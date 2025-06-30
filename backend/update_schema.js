const { pool } = require('./config/db');

async function updateSchema() {
  try {
    console.log('Checking if image_url column exists in products table...');
    
    const [imageUrlColumn] = await pool.query(`
      SHOW COLUMNS FROM products LIKE 'image_url'
    `);
    
    if (imageUrlColumn.length === 0) {
      console.log('Adding image_url column to products table...');
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN image_url VARCHAR(255) NULL
      `);
      console.log('image_url column added to products table successfully');
    } else {
      console.log('image_url column already exists in products table');
    }
    
    // Update users table to set all email_verified to true
    console.log('Updating users table to remove email verification requirements...');
    
    // Set all users to email_verified = true
    await pool.query(`
      UPDATE users SET email_verified = TRUE
    `);
    console.log('All users set to email_verified = true');
    
    // Check if verification_token column exists
    const [verificationTokenColumn] = await pool.query(`
      SHOW COLUMNS FROM users LIKE 'verification_token'
    `);
    
    if (verificationTokenColumn.length > 0) {
      console.log('Setting all verification_token values to NULL...');
      await pool.query(`
        UPDATE users SET verification_token = NULL
      `);
      console.log('All verification_token values set to NULL');
    }
    
    // Check if phone_number column exists in users table
    console.log('Checking if phone_number column exists in users table...');
    
    const [phoneNumberColumn] = await pool.query(`
      SHOW COLUMNS FROM users LIKE 'phone_number'
    `);
    
    if (phoneNumberColumn.length === 0) {
      console.log('Adding phone_number column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN phone_number VARCHAR(20) NULL
      `);
      console.log('phone_number column added to users table successfully');
    } else {
      console.log('phone_number column already exists in users table');
    }
    
    console.log('Database schema updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
}

// Run the function
updateSchema();
