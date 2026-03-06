# 🏥 MedSecure - Healthcare Privacy & Security Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![Django](https://img.shields.io/badge/django-5.0.4-green.svg)
![React](https://img.shields.io/badge/react-19.2.0-blue.svg)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [User Roles](#user-roles)
- [Security Features](#security-features)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 📖 Overview

**MedSecure** is a comprehensive healthcare information management system designed to address critical challenges in medical data security, patient privacy, and regulatory compliance. The platform implements advanced privacy-preserving technologies while maintaining operational efficiency for healthcare providers.

### 🎯 Project Goals

- Protect patient privacy using differential privacy techniques
- Provide secure, role-based access to medical records
- Maintain comprehensive audit trails for compliance
- Enable transparent data access for patients
- Implement defense-in-depth security architecture
- Support clinical workflows efficiently

---

## ✨ Key Features

### 🔐 Security & Authentication

- **Multi-Factor Authentication (MFA)** - OTP-based two-factor authentication for enhanced security
- **JWT Token Authentication** - Secure token-based API authentication with short-lived access tokens (5 min) and refresh tokens (1 day)
- **Session Management** - Automatic session timeout and secure token refresh
- **Password Security** - Strong password requirements and secure hashing

### 👥 Role-Based Access Control (RBAC)

- **Five User Roles**: Admin, Doctor, Nurse, Patient, Receptionist/Staff
- **Granular Permissions** - Role-specific access to features and data
- **Least Privilege Principle** - Users receive minimum necessary permissions
- **Dynamic Authorization** - Real-time permission checking on all operations

### 🔒 Differential Privacy

- **Privacy Budget Tracking** - Monitor and enforce privacy budgets per patient
- **Query Noise Addition** - Mathematical guarantees for data privacy
- **Budget Alerts** - Automatic alerts when privacy budgets are depleted
- **Configurable Epsilon Values** - Customizable privacy/utility tradeoffs

### 📊 Comprehensive Audit Logging

- **Complete Access Tracking** - Log every data access, view, and modification
- **User Activity Monitoring** - Track login attempts, role changes, and actions
- **Security Event Logging** - Record authentication failures and suspicious activities
- **Audit Dashboard** - Real-time visualization of audit logs for administrators

### ⚕️ Patient Records Management

- **Electronic Medical Records (EMR)** - Complete patient information management
- **Sensitivity Levels** - Four-tier classification: Public, Internal, Confidential, Highly Confidential
- **Document Upload** - Secure file attachments for medical documents
- **Medical History** - Comprehensive patient history with timeline views

### 🚨 Security Monitoring

- **Real-Time Risk Assessment** - Continuous monitoring of security metrics
- **Automated Alerts** - Notifications for suspicious activities and security events
- **Anomaly Detection** - Identify unusual access patterns
- **Risk Dashboard** - Centralized view of security risks and incidents

### 📈 Patient Transparency Portal

- **Access History** - Patients can view who accessed their records
- **Privacy Budget Visibility** - See current privacy budget status
- **Data Download** - Export personal medical records
- **Consent Management** - Control data sharing preferences

---

## 🛠️ Technology Stack

### Frontend

- **React 19.2.0** - Modern UI library with hooks and context
- **React Router DOM 7.13.1** - Client-side routing
- **Vite 7.3.1** - Fast build tool and development server
- **Tailwind CSS 4.2.1** - Utility-first CSS framework
- **Axios 1.13.6** - HTTP client for API requests
- **Lucide React 0.575.0** - Modern icon library

### Backend

- **Django 5.0.4** - High-level Python web framework
- **Django REST Framework 3.15.1** - RESTful API development
- **Django REST Framework SimpleJWT 5.3.1** - JWT authentication
- **Django CORS Headers 4.4.0** - Cross-origin resource sharing
- **Python 3.9+** - Modern Python runtime
- **SQLite/PostgreSQL** - Database flexibility

### Development Tools

- **ESLint** - JavaScript/React linting
- **Python Dotenv** - Environment variable management
- **Gunicorn** - WSGI HTTP server (production)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│                  (React SPA - Port 5173)                    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS
                     │ JWT Tokens
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Django Backend API                         │
│                    (Port 8000)                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Users   │  │ Patients │  │  Audit   │  │ Security │   │
│  │   App    │  │   App    │  │   App    │  │   App    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Privacy Budget App                          │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Authentication Middleware (JWT)                   │  │
│  │    CORS Middleware                                   │  │
│  │    CSRF Protection                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (SQLite/PostgreSQL)                   │
│  - User data  - Patient records  - Audit logs               │
│  - Privacy budgets  - Security events                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Python** 3.9 or higher
- **pip** 21.x or higher
- **Git** (for cloning the repository)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd medsecure
```

### Step 2: Backend Setup

1. **Create Virtual Environment**
   ```bash
   cd backend
   python -m venv venv
   ```

2. **Activate Virtual Environment**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   Create a `.env` file in the `backend` directory:
   ```env
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   DATABASE_URL=sqlite:///db.sqlite3
   
   # JWT Settings
   JWT_ACCESS_TOKEN_LIFETIME=5  # minutes
   JWT_REFRESH_TOKEN_LIFETIME=1440  # minutes (1 day)
   
   # CORS Settings
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   ```

5. **Database Migration**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create Superuser**
   ```bash
   python manage.py createsuperuser
   ```
   
   Or use the provided script:
   ```bash
   python set_admin_password.py
   ```
   (Default: username=`admin`, password=`admin123`)

7. **Create Test Users (Optional)**
   ```bash
   python create_test_users.py
   ```

### Step 3: Frontend Setup

1. **Navigate to Root Directory**
   ```bash
   cd ..  # Back to project root
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure API Endpoint (if needed)**
   Edit `src/api/axiosConfig.js` if your backend runs on a different port:
   ```javascript
   const API_BASE_URL = 'http://127.0.0.1:8000';
   ```

---

## ⚙️ Configuration

### Backend Configuration

**File**: `backend/config/settings.py`

Key configurations:
- Database settings
- CORS allowed origins
- JWT token lifetimes
- Session timeouts
- Logging configuration
- Security settings (CSRF, XSS protection)

### Frontend Configuration

**File**: `src/api/axiosConfig.js`

Configure:
- API base URL
- Request interceptors
- Response interceptors
- Token management

**File**: `vite.config.js`

Configure:
- Development server port
- Proxy settings
- Build optimizations

---

## 🚀 Running the Application

### Development Mode

#### Option 1: Using Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

#### Option 2: Using Start Script (Windows)

```bash
start.bat
```

*Note: Update paths in `start.bat` if your installation directory differs.*

### Access Points

- **Frontend Application**: http://localhost:5173
- **Backend API**: http://127.0.0.1:8000
- **Django Admin Panel**: http://127.0.0.1:8000/admin
- **API Documentation**: http://127.0.0.1:8000/api/

### Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change default credentials in production!**

---

## 👤 User Roles

### 1. Administrator
**Capabilities:**
- Manage all users and roles
- View comprehensive audit logs
- Monitor security risks and alerts
- Manage system settings
- Access all patient records
- Configure privacy settings

### 2. Doctor
**Capabilities:**
- View and edit assigned patient records
- Create new patient records
- Add medical notes and prescriptions
- View patient medical history
- Access diagnostic results
- Limited audit log access (own activities)

### 3. Nurse
**Capabilities:**
- View assigned patient records
- Update vital signs and observations
- Add nursing notes
- View medication schedules
- Limited editing capabilities

### 4. Patient
**Capabilities:**
- View own medical records
- Access personal health history
- View who accessed their records (transparency)
- Monitor privacy budget
- Update personal information
- Download medical records

### 5. Receptionist/Staff
**Capabilities:**
- Manage appointments
- Register new patients
- Update basic patient information
- View patient demographics
- Schedule appointments

---

## 🔒 Security Features

### Authentication Flow

```
1. User enters credentials
2. Backend validates credentials
3. If valid, generate JWT access token (5 min expiry)
4. Generate refresh token (1 day expiry)
5. Return tokens to client
6. Client stores tokens (httpOnly cookies recommended)
7. Include access token in Authorization header
8. Validate token on each request
9. Refresh token when access token expires
```

### Authorization Checks

- **Endpoint-level**: Decorator-based permission checking
- **Object-level**: Row-level security for data access
- **Field-level**: Sensitive fields hidden based on role
- **Action-level**: CRUD operations restricted by role

### Data Protection

- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS in production
- **Password Security**: PBKDF2 hashing with salt
- **Token Security**: Short-lived tokens, secure storage
- **CSRF Protection**: Token-based CSRF prevention
- **XSS Protection**: Content Security Policy headers

### Audit Logging

All actions are logged with:
- User ID and username
- Timestamp
- Action type (view, create, update, delete)
- Resource accessed
- IP address
- User agent
- Success/failure status

---

## 📡 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | User login |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | User logout |
| POST | `/api/auth/verify-otp/` | Verify OTP for MFA |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/` | List all users (admin) |
| GET | `/api/users/{id}/` | Get user details |
| POST | `/api/users/` | Create new user |
| PUT | `/api/users/{id}/` | Update user |
| DELETE | `/api/users/{id}/` | Delete user |
| GET | `/api/users/me/` | Get current user |

### Patient Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients/` | List patients |
| GET | `/api/patients/{id}/` | Get patient details |
| POST | `/api/patients/` | Create patient record |
| PUT | `/api/patients/{id}/` | Update patient record |
| DELETE | `/api/patients/{id}/` | Delete patient record |
| GET | `/api/patients/{id}/history/` | Get patient history |

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/` | List audit logs (admin) |
| GET | `/api/audit/{id}/` | Get audit log details |
| GET | `/api/audit/user/{user_id}/` | Get user-specific logs |
| GET | `/api/audit/patient/{patient_id}/` | Get patient access logs |

### Privacy Budget

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/privacy-budget/` | List privacy budgets |
| GET | `/api/privacy-budget/{patient_id}/` | Get patient budget |
| POST | `/api/privacy-budget/{patient_id}/consume/` | Consume budget |
| POST | `/api/privacy-budget/{patient_id}/reset/` | Reset budget (admin) |

### Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/security/alerts/` | List security alerts |
| GET | `/api/security/risks/` | Get risk assessment |
| POST | `/api/security/alerts/{id}/acknowledge/` | Acknowledge alert |

---

## 📁 Project Structure

```
medsecure/
├── backend/                      # Django Backend
│   ├── apps/                     # Django Applications
│   │   ├── users/               # User management
│   │   │   ├── models.py        # User model
│   │   │   ├── serializers.py   # User serializers
│   │   │   ├── views.py         # User views/endpoints
│   │   │   └── urls.py          # User URL routing
│   │   ├── patients/            # Patient records
│   │   │   ├── models.py        # Patient model
│   │   │   ├── serializers.py   # Patient serializers
│   │   │   └── views.py         # Patient CRUD operations
│   │   ├── audit/               # Audit logging
│   │   │   ├── models.py        # AuditLog model
│   │   │   ├── views.py         # Audit log retrieval
│   │   │   └── middleware.py    # Auto-logging middleware
│   │   ├── security/            # Security features
│   │   │   ├── models.py        # SecurityAlert model
│   │   │   ├── views.py         # Security monitoring
│   │   │   └── utils.py         # Security utilities
│   │   └── privacy_budget/      # Privacy budget tracking
│   │       ├── models.py        # PrivacyBudget model
│   │       ├── views.py         # Budget management
│   │       └── utils.py         # Privacy calculations
│   ├── config/                  # Django Configuration
│   │   ├── settings.py          # Global settings
│   │   ├── urls.py              # Main URL configuration
│   │   └── wsgi.py              # WSGI application
│   ├── logs/                    # Application logs
│   ├── manage.py                # Django management script
│   ├── requirements.txt         # Python dependencies
│   ├── db.sqlite3              # SQLite database
│   └── create_test_users.py    # Test data script
│
├── src/                         # React Frontend
│   ├── components/              # Reusable components
│   │   ├── auth/               # Authentication components
│   │   │   └── OTPModal.jsx    # MFA OTP modal
│   │   ├── security/           # Security components
│   │   │   └── RiskAlertBanner.jsx
│   │   ├── AuditTable.jsx      # Audit log table
│   │   ├── PatientTable.jsx    # Patient list table
│   │   ├── PrivacyProgress.jsx # Privacy budget display
│   │   ├── SensitivityBadge.jsx # Data sensitivity indicator
│   │   └── Card.jsx            # UI card component
│   ├── pages/                   # Page components
│   │   ├── Login.jsx           # Login page
│   │   ├── Dashboard.jsx       # Main dashboard
│   │   ├── Patients.jsx        # Patient list
│   │   ├── PatientDetail.jsx   # Patient details
│   │   ├── AdminPanel.jsx      # Admin dashboard
│   │   ├── AdminAudit.jsx      # Audit log viewer
│   │   ├── AdminRisk.jsx       # Risk monitoring
│   │   ├── PrivacyBudget.jsx   # Privacy budget page
│   │   └── PatientTransparency.jsx  # Patient access logs
│   ├── layout/                  # Layout components
│   │   ├── AppLayout.jsx       # Main app layout
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   ├── Topbar.jsx          # Top navigation bar
│   │   └── ProtectedRoute.jsx  # Route guard
│   ├── context/                 # React Context
│   │   └── AuthContext.jsx     # Authentication context
│   ├── api/                     # API Layer
│   │   └── axiosConfig.js      # Axios configuration
│   ├── utils/                   # Utility functions
│   │   └── cookieHelper.js     # Cookie management
│   ├── App.jsx                  # Main App component
│   └── main.jsx                 # Application entry point
│
├── public/                      # Static assets
├── package.json                 # Node dependencies
├── vite.config.js              # Vite configuration
├── eslint.config.js            # ESLint configuration
├── start.bat                    # Windows start script
└── README.md                    # This file
```

---

## 🧪 Testing

### Backend Testing

```bash
cd backend
python manage.py test
```

Run specific app tests:
```bash
python manage.py test apps.users
python manage.py test apps.patients
python manage.py test apps.audit
```

### Frontend Testing

```bash
npm run lint
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

---

## 🚢 Deployment

### Production Checklist

#### Backend

- [ ] Set `DEBUG=False` in settings
- [ ] Configure production database (PostgreSQL recommended)
- [ ] Set strong `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS
- [ ] Configure static file serving
- [ ] Set up Gunicorn/uWSGI
- [ ] Configure reverse proxy (Nginx/Apache)
- [ ] Set up database backups
- [ ] Configure logging to files
- [ ] Enable security headers
- [ ] Set up SSL certificates

#### Frontend

- [ ] Build production bundle: `npm run build`
- [ ] Configure environment variables
- [ ] Update API endpoints
- [ ] Enable HTTPS
- [ ] Configure CDN (optional)
- [ ] Set up compression (gzip/brotli)
- [ ] Configure caching headers
- [ ] Set up monitoring

### Environment Variables (Production)

```env
# Backend (.env)
SECRET_KEY=<strong-random-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://user:pass@localhost/medsecure
CORS_ALLOWED_ORIGINS=https://yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### Deployment Platforms

- **Backend**: AWS EC2, DigitalOcean, Heroku, Railway
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: AWS RDS, DigitalOcean Managed Databases

---

## 🔧 Troubleshooting

### Common Issues

#### Backend won't start

**Issue**: `ModuleNotFoundError: No module named 'django'`
**Solution**: 
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend can't connect to backend

**Issue**: CORS errors in browser console
**Solution**: 
- Check `CORS_ALLOWED_ORIGINS` in backend settings
- Ensure frontend URL matches allowed origins
- Verify backend server is running

#### Database migrations fail

**Issue**: Migration conflicts
**Solution**:
```bash
python manage.py migrate --fake-initial
# or
python manage.py migrate --run-syncdb
```

#### JWT token expired errors

**Issue**: 401 Unauthorized errors
**Solution**: 
- Token refresh should happen automatically
- Clear browser cookies and re-login
- Check token expiration settings

#### Port already in use

**Issue**: Backend/Frontend port conflict
**Solution**:
```bash
# Windows - Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Change port in vite.config.js or runserver command
python manage.py runserver 8001
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and commit: `git commit -m "Add your feature"`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a Pull Request

### Code Style

- **Python**: Follow PEP 8
- **JavaScript/React**: Follow Airbnb style guide
- **Commits**: Use conventional commit messages

### Testing Requirements

- Add tests for new features
- Ensure all tests pass before submitting PR
- Maintain or improve code coverage

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact: support@medsecure.example.com

---

## 🙏 Acknowledgments

- Django and Django REST Framework communities
- React.js team
- Healthcare security research community
- Open-source contributors

---

## 📊 Project Status

**Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: March 2026

### Roadmap

- [ ] Mobile application (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with EHR systems (HL7 FHIR)
- [ ] Blockchain-based audit trails
- [ ] Machine learning for anomaly detection
- [ ] Multi-language support
- [ ] Telemedicine integration

---

**Built with ❤️ for healthcare privacy and security**
