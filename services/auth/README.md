# Authentication Service

A complete Django REST Framework authentication service with JWT token-based authentication, role-based access control, and user management.

## Features

- ✅ User registration and login with email
- ✅ JWT token-based authentication
- ✅ Role-based access control (User, Agent, Admin)
- ✅ Token refresh and rotation
- ✅ User profile management
- ✅ Admin role assignment
- ✅ PostgreSQL database support
- ✅ Redis caching
- ✅ CORS support for microservices
- ✅ Comprehensive admin panel

## Project Structure

```
auth_service/
├── auth_service/          # Main Django project settings
│   ├── settings.py        # Project settings (DB, JWT, CORS, etc.)
│   ├── urls.py           # Main URL configuration
│   ├── wsgi.py           # WSGI application
│   └── asgi.py           # ASGI application
├── users/                 # Users app
│   ├── models.py         # User and Roles models
│   ├── views.py          # Authentication viewsets
│   ├── serializers.py    # Serializers for validation
│   ├── permissions.py    # Custom permission classes
│   ├── urls.py           # Users app URLs
│   ├── admin.py          # Django admin configuration
│   └── management/       # Management commands
│       └── commands/
│           └── create_superuser.py
├── requirements.txt      # Project dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker compose configuration
└── manage.py           # Django management script
```

## Installation

### Prerequisites

- Python 3.10+
- PostgreSQL 12+
- Redis 6+
- Docker & Docker Compose

### Local Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
cd services/auth
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/Scripts/activate  # On Windows
source venv/bin/activate      # On Mac/Linux
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```bash
cp .env.example .env
```

5. Configure environment variables in `.env`:
```env
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
POSTGRES_DB=auth_service
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

6. Run migrations:
```bash
python manage.py migrate
```

7. Create superuser:
```bash
python manage.py create_superuser admin@example.com password12345
```

8. Start development server:
```bash
python manage.py runserver
```

### Docker Setup

1. Build and start containers:
```bash
docker-compose up -d
```

2. Run migrations:
```bash
docker-compose exec web python manage.py migrate
```

3. Create superuser:
```bash
docker-compose exec web python manage.py create_superuser admin@example.com password12345
```

4. Access the service:
- API: http://localhost:8000/api/v1/
- Admin: http://localhost:8000/admin/

## API Endpoints

### Authentication

#### Register User
```http
POST /api/v1/users/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePass123",
  "password_confirm": "SecurePass123"
}
```

#### Login
```http
POST /api/v1/users/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

Response:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "date_joined": "2024-01-01T10:00:00Z",
    "roles": ["user"]
  },
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "message": "Login successful"
}
```

#### Logout
```http
POST /api/v1/users/logout/
Authorization: Bearer <access-token>
```

#### Refresh Token
```http
POST /api/users/refresh_token/
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refresh": "<refresh-token>"
}
```

#### Get Current User
```http
GET /api/users/me/
Authorization: Bearer <access-token>
```

### User Management

#### List Users (Admin only)
```http
GET /api/users/users/
Authorization: Bearer <access-token>
```

#### Get User Details (Admin or Owner)
```http
GET /api/users/users/{id}/
Authorization: Bearer <access-token>
```

#### Update User (Admin or Owner)
```http
PATCH /api/users/users/{id}/
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith"
}
```

#### Assign Role (Admin only)
```http
POST /api/v1/users/users/{id}/assign_role/
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "role": "agent"
}
```

Valid roles: `user`, `agent`, `admin`

## User Models

### User Model
- `id`: Auto-generated ID
- `email`: Unique email address (USERNAME_FIELD)
- `first_name`: Optional first name
- `last_name`: Optional last name
- `password`: Hashed password
- `is_active`: Account active status (default: True)
- `is_staff`: Staff status (default: False)
- `is_superuser`: Superuser status (default: False)
- `date_joined`: Registration timestamp

### Roles Model
- `user`: ForeignKey to User
- `role`: One of 'user', 'agent', 'admin'
- `created_at`: Role assignment timestamp

## Permission Classes

### Available Permissions

- `IsAdmin`: Only admin users
- `IsAgent`: Only agent users
- `IsAdminOrAgent`: Admins or agents
- `HasRole`: Generic role checker
- `IsOwner`: Own resources only
- `IsOwnerOrAdmin`: Own resources or admin
- `AllowAny`: Everyone

## JWT Configuration

Token lifetimes (configurable in settings.py):
- Access Token: 60 minutes
- Refresh Token: 7 days
- Token Rotation: Enabled
- Refresh Token Blacklisting: Enabled

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one digit

## Database Schema

### Users Table
```sql
CREATE TABLE users_user (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(30),
  last_name VARCHAR(30),
  password VARCHAR(128) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_staff BOOLEAN DEFAULT FALSE,
  is_superuser BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  date_joined TIMESTAMP DEFAULT NOW()
);
```

### Roles Table
```sql
CREATE TABLE users_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users_user(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

## CORS Configuration

By default, the service accepts requests from:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8000',
]
```

Configure in `.env`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://example.com
```

## Caching

Redis is used for:
- Token blacklisting
- Session caching
- Rate limiting
- General application cache

Configure in `.env`:
```env
REDIS_URL=redis://localhost:6379/0
```

## Common Issues & Solutions

### Issue: No module named 'users'
**Solution**: Ensure 'users' is in INSTALLED_APPS in settings.py

### Issue: ModuleNotFoundError: No module named 'rest_framework_simplejwt'
**Solution**: Run `pip install -r requirements.txt`

### Issue: Database connection error
**Solution**: Check DATABASE_URL and POSTGRES_* environment variables

### Issue: CORS errors
**Solution**: Update CORS_ALLOWED_ORIGINS in settings.py or .env file

## Security Best Practices

1. ✅ Always use HTTPS in production
2. ✅ Keep SECRET_KEY secret
3. ✅ Enable CSRF protection
4. ✅ Use strong passwords (enforced)
5. ✅ Refresh tokens are short-lived
6. ✅ Token rotation enabled
7. ✅ SQL injection protection via ORM
8. ✅ XSS protection enabled
9. ✅ Secure password hashing (PBKDF2)

## Management Commands

### Create Superuser
```bash
python manage.py create_superuser <email> <password> \
  --first-name <name> --last-name <name>
```

Example:
```bash
python manage.py create_superuser admin@example.com SecurePass123 \
  --first-name Admin --last-name User
```

### Django Built-in Commands
```bash
# Run migrations
python manage.py migrate

# Create migration
python manage.py makemigrations

# Create app
python manage.py startapp <app_name>

# Access shell
python manage.py shell

# Collect static files
python manage.py collectstatic
```

## Testing

Run tests:
```bash
python manage.py test
```

## Environment Variables

See `.env.example` for all available configuration options.

## API Documentation

Full API documentation available at:
- Swagger UI: `/api/v1/docs/` (if drf-spectacular installed)
- ReDoc: `/api/v1/redoc/` (if drf-spectacular installed)

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
