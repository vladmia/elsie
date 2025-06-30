# FreshLink Project Setup Guide

This guide will walk you through setting up the FreshLink project on your local machine.

## Prerequisites

Before you begin, make sure you have the following installed:

- Node.js (v14.x or higher)
- npm (v6.x or higher)
- MySQL (v5.7 or higher)
- Git

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/elsie.git

# Navigate to the project directory
cd elsie
```

## Step 2: Set Up the Backend

### Install Dependencies

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```

### Configure Environment Variables

```bash
# Copy the example environment file
cp config/config.env.example config/config.env

# Open the file and update the values
# You'll need to set:
# - PORT (default: 3000)
# - DB_HOST
# - DB_USER
# - DB_PASS
# - DB_NAME
# - JWT_SECRET
# - JWT_EXPIRE
# - EMAIL_FROM
# - EMAIL_SERVICE (if using email functionality)
# - EMAIL_USERNAME
# - EMAIL_PASSWORD
```

### Set Up the Database

```bash
# Create a MySQL database
mysql -u root -p
```

In the MySQL shell:

```sql
CREATE DATABASE freshlink;
EXIT;
```

### Initialize the Database Schema

```bash
# Run the database setup script
node update_schema.js
```

This script will create all necessary tables and seed initial data including:
- Admin user
- Basic categories
- Sample products

## Step 3: Set Up the Frontend

### Install Dependencies

```bash
# Navigate to the frontend directory from the project root
cd ../frontend

# Install dependencies
npm install
```

### Configure Environment Variables

```bash
# Create a .env file in the frontend/config directory
mkdir -p config
touch config/.env

# Add the following to the .env file:
PORT=4000
API_URL=http://localhost:3000
SESSION_SECRET=your_session_secret_here
```

## Step 4: Start the Servers

### Start the Backend Server

```bash
# In the backend directory
cd ../backend
npm run dev
```

You should see:
```
Backend server running on port 3000
Database connected: localhost
```

### Start the Frontend Server

```bash
# In a new terminal, navigate to the frontend directory
cd path/to/elsie/frontend
npm run dev
```

You should see:
```
Frontend server running on port 4000
Visit http://localhost:4000
```

## Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:4000
```

## Default Login Credentials

### Admin User
- Email: admin@example.com
- Password: adminpass

### Sample Farmer
- Email: farmer@example.com
- Password: farmerpass

### Sample Vendor
- Email: vendor@example.com
- Password: vendorpass

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify your MySQL service is running
2. Check your database credentials in `backend/config/config.env`
3. Make sure the database exists
4. Try running the schema update script again: `node update_schema.js`

### Port Already in Use

If you see "Port already in use" errors:

1. Change the port in the respective .env file
2. Update cross-references (e.g., if you change the backend port, update API_URL in the frontend .env)

### CORS Issues

If you see CORS-related errors in the console:

1. Make sure both servers are running
2. Verify the API_URL in the frontend .env file matches the backend URL
3. Check that the backend CORS configuration allows requests from the frontend origin

## Development Workflow

1. Make changes to the code
2. The servers will automatically restart thanks to nodemon
3. Refresh your browser to see changes

## Additional Configuration

### Google OAuth (Optional)

To enable Google OAuth login:

1. Create a project in Google Developer Console
2. Set up OAuth credentials
3. Add the client ID and secret to `backend/config/config.env`
4. Place the credentials JSON file in `backend/utils/`

### Phone Number Validation (Optional)

Phone number validation is handled by Google's libphonenumber library, which is already installed as a dependency.



## Project Structure Overview

```
elsie/
  ├── backend/           # API server
  │   ├── config/        # Configuration files
  │   ├── controllers/   # Request handlers
  │   ├── middleware/    # Custom middleware
  │   ├── routes/        # API routes
  │   ├── utils/         # Helper functions
  │   └── server.js      # Main entry point
  │
  └── frontend/          # Web server
      ├── middleware/    # Custom middleware
      ├── public/        # Static assets
      ├── routes/        # Frontend routes
      ├── utils/         # Helper functions
      ├── views/         # EJS templates
      └── server.js      # Main entry point
``` 