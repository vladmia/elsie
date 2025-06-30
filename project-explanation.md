# FreshLink Project Explanation

FreshLink is a farm-to-table e-commerce platform that connects farmers directly with consumers and vendors. This document explains the project architecture, roles, routes, and how the frontend and backend interact.

## Architecture Overview

The project follows a client-server architecture with separate frontend and backend applications:

- **Backend**: Node.js/Express API server that handles data processing, authentication, and business logic
- **Frontend**: Express.js server rendering EJS templates that communicate with the backend API

### Directory Structure

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

## User Roles

FreshLink supports four user roles, each with different permissions and interfaces:

1. **Admin**: Platform administrators who manage users, products, and categories
2. **Farmer**: Producers who list and sell products on the platform
3. **Vendor**: Businesses that purchase products in bulk
4. **Customer**: End consumers who purchase products directly

## Authentication Flow

1. Users register with email, password, and phone number
2. Authentication is handled via JWT (JSON Web Tokens)
3. Token is stored in session on successful login
4. Protected routes check for valid token before granting access

### Authentication Routes

#### Backend (API)

```
POST /auth/register       # Create new user account
POST /auth/login          # Authenticate user and return JWT
GET /auth/me              # Get current user profile
POST /auth/reset-password # Request password reset
PUT /auth/reset-password  # Update password with token
```

#### Frontend (Web)

```
GET /auth/register        # Registration page
POST /auth/register       # Process registration
GET /auth/login           # Login page
POST /auth/login          # Process login
GET /auth/profile         # User profile page
GET /auth/logout          # Log out user
```

## Product Management Flow

### Backend Routes

```
GET /farm/public          # Get approved products for marketplace
GET /farm/admin-products  # Get all products (admin only)
GET /farm/my-products     # Get farmer's own products
POST /farm                # Create new product
PATCH /farm/:id           # Update product
DELETE /farm/:id          # Delete product
PATCH /farm/:id/approve   # Approve/reject product (admin only)
POST /farm/:id/approve    # Alternative approve/reject endpoint
GET /farm/:id             # Get product by ID
```

### Frontend Routes

#### Admin Routes

```
GET /admin/dashboard      # Admin dashboard
GET /admin/products       # Product management
GET /admin/products/:id   # Product detail view
GET /admin/categories     # Category management
POST /admin/categories    # Create category
POST /admin/categories/:id # Update category
POST /admin/categories/:id/delete # Delete category
```

#### Farmer Routes

```
GET /farmer/dashboard     # Farmer dashboard
GET /farmer/products      # Manage products
GET /farmer/add-product   # Add product form
POST /farmer/add-product  # Create product
GET /farmer/edit-product/:id # Edit product form
POST /farmer/edit-product/:id # Update product
GET /farmer/orders        # View orders
GET /farmer/orders/:id    # Order details
```

## Data Flow Between Frontend and Backend

1. **Frontend Server**: Handles HTTP requests from users and renders EJS templates
2. **API Communication**: Frontend server makes HTTP requests to the backend API using axios
3. **Authentication**: JWT token is passed in request headers for authenticated requests
4. **Response Handling**: API responses are processed and used to render views

### Example Flow: Product Approval

1. Admin views pending products on `/admin/products?filter=pending`
2. Admin clicks "Approve" button on a product
3. Frontend sends POST request to `/admin/api/farm/:id/approve` with `{approved: true}`
4. Frontend route forwards request to backend API at `/farm/:id/approve`
5. Backend validates admin permissions and updates product status
6. Backend returns success response
7. Frontend reloads page to show updated status

## Database Schema

The application uses MySQL with the following main tables:

1. **users**: User accounts and authentication
2. **products**: Product listings with approval status
3. **categories**: Product categories
4. **orders**: Customer and vendor orders
5. **order_items**: Individual items in orders

## Testing Examples

### 1. User Registration and Login

```
# Register a new farmer account
1. Visit: http://localhost:4000/auth/register
2. Fill in details:
   - Name: Test Farmer
   - Email: farmer@example.com
   - Password: password123
   - Phone: +1234567890
   - Role: Farmer
3. Submit form
4. Should redirect to login page

# Login with new account
1. Visit: http://localhost:4000/auth/login
2. Enter credentials:
   - Email: farmer@example.com
   - Password: password123
3. Submit form
4. Should redirect to farmer dashboard
```

### 2. Adding a Product (Farmer)

```
# Add new product
1. Login as farmer
2. Navigate to: http://localhost:4000/farmer/add-product
3. Fill in details:
   - Title: Organic Tomatoes
   - Description: Fresh organic tomatoes
   - Price: 60.00
   - Quantity: 20
   - Category: Vegetables
4. Submit form
5. Should redirect to products page with success message
6. Product should be listed with "Pending Approval" status
```

### 3. Approving a Product (Admin)

```
# Approve product
1. Login as admin (admin@example.com / adminpass)
2. Navigate to: http://localhost:4000/admin/products?filter=pending
3. Find the product "Organic Tomatoes"
4. Click "View" to see details
5. Click "Approve Product" button
6. Confirm in modal dialog
7. Product status should change to "Approved"
8. Product should now appear in public marketplace
```

### 4. Placing an Order (Customer)

```
# Browse marketplace and add to cart
1. Visit: http://localhost:4000/marketplace
2. Browse available products
3. Click on a product to view details
4. Add product to cart
5. Proceed to checkout
6. Complete order form
7. Submit order
8. Should see order confirmation
```

## Error Handling

1. **Form Validation**: Both frontend and backend validate user inputs
2. **Flash Messages**: Success and error messages displayed via connect-flash
3. **API Error Responses**: Structured error responses with appropriate HTTP status codes
4. **Authentication Errors**: Proper handling of unauthorized access attempts

## Responsive Design

The frontend uses Tailwind CSS for responsive design, ensuring the application works well on:
- Desktop computers
- Tablets
- Mobile phones

## File Upload

Product images can be uploaded via:
1. Direct file upload (stored in `frontend/public/uploads/`)
2. Automatic fetching from Pexels API based on product description 