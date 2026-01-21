<div align="center">

# 🔧 FreelanceHub Backend API

### RESTful API Server for FreelanceHub Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.1-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

*🎓 ITI Intensive Code Camp Graduation Project - MERN Stack Track*

[API Documentation](#-api-endpoints) • [Main Platform](../React-Freelance) • [Admin Dashboard](../Angular-Freelance-Dashboard)

</div>

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## 🎯 About The Project

The **FreelanceHub Backend API** is a robust and scalable RESTful API built with Node.js and Express.js. It serves as the backbone for the FreelanceHub freelancing platform, handling all business logic, data management, and real-time communication.

Built as part of the **ITI (Information Technology Institute) Intensive Code Camp** - 4 Months MERN Stack Track graduation project.

---

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based Authentication
- Password Hashing (bcrypt)
- Rate Limiting
- XSS Protection
- MongoDB Sanitization
- Helmet Security Headers

### 👥 User Management
- User Registration & Login
- Email Verification
- Password Reset
- Profile Management
- Role-based Authorization (Admin, Client, Freelancer)

### 💼 Job System
- CRUD Operations for Jobs
- Advanced Filtering & Search
- Category/Skill-based Organization
- Job Invitations

### 📄 Proposal & Contract System
- Proposal Submission & Management
- Contract Creation & Tracking
- Contract Modifications
- Milestone Management

### 💳 Payment Integration
- Stripe Integration
- PayPal Integration
- Wallet System
- Withdrawal Processing
- Transaction History

### 💬 Real-time Features
- Real-time Chat (Socket.io)
- Instant Notifications
- Online Status Tracking

### 📊 Additional Features
- Activity Logging
- File Uploads (Multer)
- Email Notifications (Nodemailer)
- Swagger API Documentation
- Cron Jobs for Automated Tasks

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime Environment |
| Express.js 5 | Web Framework |
| MongoDB | Database |
| Mongoose | ODM |
| Socket.io | Real-time Communication |
| JWT | Authentication |
| Stripe | Payment Processing |
| PayPal SDK | Payment Processing |
| Nodemailer | Email Service |
| Multer | File Uploads |
| Swagger | API Documentation |
| Helmet | Security |
| bcrypt | Password Hashing |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahmadabdelnby/new-node-freelance.git
   cd new-node-freelance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file (see Environment Variables section)
   cp .env.example .env
   ```

4. **Seed the database (optional)**
   ```bash
   npm run seed
   npm run seed:skills
   ```

5. **Run the development server**
   ```bash
   npm start
   ```

6. **Server will start on**
   ```
   http://localhost:3000
   ```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | Get all jobs |
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs/:id` | Get job by ID |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |

### Proposals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/proposals` | Get all proposals |
| POST | `/api/proposals` | Submit proposal |
| PUT | `/api/proposals/:id` | Update proposal |
| DELETE | `/api/proposals/:id` | Withdraw proposal |

### Contracts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts` | Get all contracts |
| POST | `/api/contracts` | Create contract |
| PUT | `/api/contracts/:id` | Update contract |
| GET | `/api/contracts/:id` | Get contract details |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/stripe` | Process Stripe payment |
| POST | `/api/payments/paypal` | Process PayPal payment |
| GET | `/api/payments/history` | Get payment history |
| POST | `/api/funds/withdraw` | Request withdrawal |

### Chat & Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | Get conversations |
| POST | `/api/messages` | Send message |
| GET | `/api/messages/:conversationId` | Get messages |

---

## 📁 Project Structure

```
├── app.js                  # Application entry point
├── Controllers/            # Route controllers
│   ├── userController.js
│   ├── jobsController.js
│   ├── contractController.js
│   ├── paymentController.js
│   ├── chatController.js
│   └── ...
├── Models/                 # Mongoose models
│   ├── User.js
│   ├── Jobs.js
│   ├── Contract.js
│   ├── Payment.js
│   └── ...
├── Routes/                 # API routes
│   ├── authRoute.js
│   ├── userRout.js
│   ├── jobRoute.js
│   └── ...
├── middleware/             # Custom middleware
│   ├── authenticationMiddle.js
│   ├── authorizationMiddle.js
│   ├── rateLimiter.js
│   └── ...
├── services/               # Business logic services
├── scripts/                # Utility scripts
└── Public/                 # Static files
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/freelancehub

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

## 🔗 Related Repositories

- **Main Platform (React)**: [new-react-freelance](https://github.com/ahmadabdelnby/new-react-freelance)
- **Admin Dashboard (Angular)**: [Angular-Freelance-Dashboard](https://github.com/ahmadabdelnby/Angular-Freelance-Dashboard)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### ⭐ Star this repo if you found it helpful!

Made with ❤️ by ITI MERN Stack Team

</div>
