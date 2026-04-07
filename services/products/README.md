# Product Microservice

A comprehensive Django REST Framework-based microservice for managing products and categories in an e-commerce platform. This service integrates with an authentication microservice for JWT-based authentication and provides role-based access control.

## Features

- **Product Management**: Create, read, update, and delete products
- **Category Management**: Organize products into categories
- **Role-Based Access Control**:
  - **Admins/Agents**: Full CRUD operations
  - **Users**: Read-only access to published products
  - **Non-users**: Read-only access to published products
- **Advanced Product Features**:
  - Draft/Published/Archived status workflow
  - Stock inventory management
  - Profit margin calculations
  - Product categorization and status management
- **Search & Filtering**: Full-text search and advanced filtering capabilities
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Comprehensive Testing**: Full test coverage for models, views, and permissions

## Project Structure

```
products/
├── models.py                 # Product and Category models
├── views.py                  # ViewSets with custom actions
├── serializers.py           # DRF serializers for API responses
├── permissions.py           # Custom permission classes
├── urls.py                  # URL routing
├── admin.py                 # Django admin configuration
├── tests.py                 # Comprehensive test suite
├── migrations/              # Database migrations
└── apps.py                  # App configuration

core/
├── settings.py              # Django settings
├── urls.py                  # Project URL configuration
├── wsgi.py                  # WSGI configuration
└── asgi.py                  # ASGI configuration
```

## Installation & Setup

### Prerequisites
- Python 3.9+
- PostgreSQL (or SQLite for development)
- Redis (for caching)

### 1. Clone and Install Dependencies

```bash
git clone <repository>
cd products
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# Django Settings
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,web

# Database Configuration (PostgreSQL)
POSTGRES_DB=products_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000
```

### 3. Database Migration

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Admin User

```bash
python manage.py createsuperuser
```

### 5. Create Agent Group (optional)

```bash
python manage.py shell
>>> from django.contrib.auth.models import Group
>>> agent_group, created = Group.objects.get_or_create(name='Agent')
>>> exit()
```

### 6. Run Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/v1/products/`

## API Documentation

### Swagger UI
- **URL**: `http://localhost:8000/api/docs/swagger/`
- Interactive API documentation with "Try it out" functionality

### ReDoc
- **URL**: `http://localhost:8000/api/docs/redoc/`
- Consolidated API documentation view

## Authentication

This service uses JWT (JSON Web Tokens) for authentication. Get a token from your authentication microservice and include it in requests:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/v1/products/
```

## API Endpoints

### Products

#### List Products
```
GET /api/v1/products/
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)
- `status`: Filter by status (draft, published, archived)
- `category`: Filter by category ID
- `is_in_stock`: Filter by stock availability (true/false)
- `search`: Search by name or description
- `ordering`: Order by field (created_at, name, price)

**Response Example:**
```json
{
  "count": 10,
  "next": "http://localhost:8000/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Laptop",
      "description": "High-performance laptop",
      "price": "1299.99",
      "category": 1,
      "category_name": "Electronics",
      "quantity_in_stock": 10,
      "is_in_stock": true,
      "status": "published",
      "created_by_username": "admin",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Product Details
```
GET /api/v1/products/{id}/
```

**Response Example:**
```json
{
  "id": 1,
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": "1299.99",
  "cost_price": "800.00",
  "category": 1,
  "category_name": "Electronics",
  "quantity_in_stock": 10,
  "is_in_stock": true,
  "image": "https://example.com/products/laptop.jpg",
  "status": "published",
  "created_by": 1,
  "created_by_username": "admin",
  "meta_description": "High-quality laptop for professionals",
  "meta_keywords": "laptop, electronics, computers",
  "profit_margin": "38.46",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Create Product (Admin/Agent Only)
```
POST /api/v1/products/
```

**Required Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": "1299.99",
  "cost_price": "800.00",
  "category": 1,
  "quantity_in_stock": 10,
  "status": "draft"
}
```

#### Update Product (Admin/Agent Only)
```
PATCH /api/v1/products/{id}/
PUT /api/v1/products/{id}/
```

#### Delete Product (Admin/Agent Only)
```
DELETE /api/v1/products/{id}/
```

#### Toggle Product Status
```
POST /api/v1/products/{id}/toggle_status/
```

**Response:**
```json
{
  "status": "success",
  "previous_status": "drafted",
  "new_status": "published"
}
```

#### Update Product Stock
```
POST /api/v1/products/{id}/update_stock/
```

**Request Body:**
```json
{
  "quantity": 5,
  "operation": "add"
}
```

**Operations:**
- `set`: Set to exact quantity
- `add`: Add to current quantity
- `subtract`: Subtract from current quantity

#### Admin Dashboard
```
GET /api/v1/products/admin_dashboard/
```

**Response:**
```json
{
  "total_products": 25,
  "published_products": 20,
  "draft_products": 4,
  "archived_products": 1,
  "low_stock_products": 3,
  "total_categories": 5
}
```

#### Featured Products
```
GET /api/v1/products/featured/
```

### Categories

#### List Categories
```
GET /api/v1/products/categories/
```

**Query Parameters:**
- `page`: Page number
- `page_size`: Items per page
- `search`: Search by name or description
- `ordering`: Order by field

#### Get Category Details
```
GET /api/v1/products/categories/{id}/
```

#### Create Category (Admin/Agent Only)
```
POST /api/v1/products/categories/
```

**Request Body:**
```json
{
  "name": "Electronics",
  "description": "Electronic items"
}
```

#### Update Category (Admin/Agent Only)
```
PATCH /api/products/categories/{id}/
PUT /api/products/categories/{id}/
```

#### Delete Category (Admin/Agent Only)
```
DELETE /api/products/categories/{id}/
```

#### Toggle Category Active Status
```
POST /api/v1/products/categories/{id}/toggle_active/
```

## Permission Models

### IsAdminOrReadOnly
- **Read Operations (GET, HEAD, OPTIONS)**: Everyone
- **Write Operations (POST, PUT, PATCH, DELETE)**: Admin/Agent only

### IsAdminOrAgent
- **All Operations**: Admin/Agent only

### IsAuthenticatedOrReadOnly
- **Read Operations**: Everyone
- **Write Operations**: Authenticated admin/agent only

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
python manage.py test products

# Run with coverage
coverage run --source='products' manage.py test products
coverage report
coverage html  # Generate HTML coverage report

# Run specific test class
python manage.py test products.tests.ProductViewSetTest

# Run specific test method
python manage.py test products.tests.ProductViewSetTest.test_create_product_as_admin
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up --build
```

The service will be available at `http://localhost:8000`

### Environment Variables for Docker

Update `docker-compose.yml` with your environment variables or use a `.env` file.

## Integration with Authentication Microservice

### JWT Token Integration

1. **Obtain JWT Token** from your authentication microservice:

```bash
curl -X POST http://auth-service:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password"
  }'
```

2. **Use Token in Requests**:

```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8000/api/v1/products/
```

3. **Refresh Token** when expired:

```bash
curl -X POST http://auth-service:8000/api/v1/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "<refresh_token>"
  }'
```

## Role-Based Access Control

### Admin
- Full access to all endpoints
- Can view all product statuses (draft, published, archived)
- Can view and manage all users' products

### Agent
- Same permissions as Admin through group membership
- Assigned by admins through Django admin panel

### Regular Users
- Can only view published products
- Cannot create, update, or delete products
- No access to draft or archived products

### Non-Authenticated Users
- Can only view published products
- Cannot access protected endpoints
- No authentication required for read operations

## Best Practices

### Security
- Always use HTTPS in production
- Rotate JWT secrets regularly
- Keep sensitive data in environment variables
- Set appropriate CORS origins

### Performance
- Use pagination for large datasets
- Implement caching for frequently accessed products
- Use database indexes (already configured)
- Consider lazy loading for related objects

### API Usage
- Always include proper error handling
- Use appropriate HTTP status codes
- Implement request validation
- Rate limit API calls in production

## Troubleshooting

### Database Connection Issues
```bash
# Check database credentials in .env
# Test PostgreSQL connection
psql -U postgres -h localhost -d products_db
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping

# Update REDIS_URL if needed
REDIS_URL=redis://localhost:6379/0
```

### Authentication Errors
- Ensure JWT tokens are valid and not expired
- Check Authorization header format: `Authorization: Bearer <token>`
- Verify user has appropriate permissions (is_staff or in Agent group)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or contributions, please create an issue in the repository or contact the development team.