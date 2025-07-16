
# AfricanMarket - Multi-Service Marketplace Platform

## Overview
AfricanMarket is a comprehensive marketplace platform that combines food delivery, rideshare services, and vendor management into a unified ecosystem. Built with Next.js 14, TypeScript, and modern web technologies, it provides a seamless experience for customers, vendors, and drivers.

## 🚀 Features

### For Customers
- **Restaurant Discovery**: Browse and search restaurants by cuisine, location, and ratings
- **Food Ordering**: Complete ordering system with cart management and real-time tracking
- **Rideshare Service**: Book rides with real-time driver tracking and fare estimation
- **Multiple Payment Options**: Credit cards, digital wallets, and cash payments
- **Order History**: Track past orders and reorder favorites
- **Real-time Notifications**: SMS, email, and push notifications for order updates

### For Vendors
- **Restaurant Management**: Complete vendor dashboard with menu and inventory management
- **Order Processing**: Real-time order notifications and status management
- **Analytics Dashboard**: Sales analytics, performance metrics, and customer insights
- **Payment Processing**: Automated payments with detailed financial reporting
- **Marketing Tools**: Promotional campaigns and customer engagement features

### For Drivers
- **Driver Dashboard**: Comprehensive interface for delivery and ride management
- **Route Optimization**: Integrated navigation with optimal route suggestions
- **Earnings Tracking**: Real-time earnings tracking with detailed payment history
- **Availability Management**: Flexible scheduling and availability controls
- **Performance Metrics**: Delivery statistics and customer ratings

### Admin Features
- **System Monitoring**: Real-time health monitoring and performance dashboards
- **User Management**: Comprehensive user, vendor, and driver administration
- **Analytics Suite**: Business intelligence with revenue and usage analytics
- **Content Management**: Platform content and promotional material management
- **Support Tools**: Customer support ticket management and resolution tracking

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Custom Components
- **Animations**: Framer Motion
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod Validation

### Backend
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **File Storage**: Cloudinary
- **Caching**: Redis
- **Email**: SendGrid
- **SMS**: Twilio
- **Payments**: Stripe with Connect

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (production)
- **Monitoring**: Sentry + Custom Health Checks
- **Analytics**: Google Analytics 4
- **Maps**: Google Maps API
- **Real-time**: Socket.IO + WebSockets

## 📋 Prerequisites

### System Requirements
- Node.js 18+ 
- Yarn package manager
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### External Services Required
- **Cloudinary** (file storage)
- **Stripe** (payment processing)
- **SendGrid** (email service)
- **Google Maps API** (mapping service)
- **Twilio** (SMS service - optional)
- **Sentry** (error monitoring - optional)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-username/africanmarket.git
cd africanmarket/app
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.development.template .env.local

# Edit environment variables
nano .env.local
```

### 4. Database Setup
```bash
# Start database with Docker
docker-compose up -d postgres redis

# Generate Prisma client
yarn prisma generate

# Run migrations
yarn prisma migrate dev

# Seed database
yarn prisma db seed
```

### 5. Start Development Server
```bash
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
app/
├── api/                      # Standalone API server
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   ├── auth/                 # Authentication pages
│   ├── dashboard/            # User dashboard
│   ├── vendor/               # Vendor management
│   ├── driver/               # Driver interface
│   ├── admin/                # Admin panel
│   └── globals.css           # Global styles
├── components/               # Reusable UI components
│   ├── ui/                   # Base UI components
│   ├── auth/                 # Authentication components
│   ├── marketplace/          # Marketplace components
│   ├── vendor/               # Vendor components
│   ├── driver/               # Driver components
│   └── admin/                # Admin components
├── lib/                      # Utility libraries
│   ├── auth.ts               # Authentication config
│   ├── db.ts                 # Database client
│   ├── utils.ts              # Utility functions
│   └── types.ts              # TypeScript types
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets
├── scripts/                  # Deployment and utility scripts
├── monitoring/               # Monitoring and analytics
├── security/                 # Security configurations
├── launch/                   # Launch and deployment docs
└── docs/                     # Additional documentation
```

## 🔧 Development

### Available Scripts
```bash
# Development
yarn dev                      # Start development server
yarn build                    # Build for production
yarn start                    # Start production server
yarn lint                     # Run ESLint
yarn type-check               # TypeScript type checking

# Database
yarn prisma:migrate           # Run database migrations
yarn prisma:generate          # Generate Prisma client
yarn prisma:seed              # Seed database
yarn prisma:studio            # Open Prisma studio

# Testing
yarn test                     # Run tests
yarn test:watch               # Run tests in watch mode
yarn test:coverage            # Run tests with coverage

# Deployment
yarn deploy:staging           # Deploy to staging
yarn deploy:production        # Deploy to production
```

### Key Development Commands
```bash
# Add new dependencies
yarn add package-name

# Add development dependencies  
yarn add -D package-name

# Database schema changes
yarn prisma migrate dev --name feature-name

# Generate new migration
yarn prisma migrate dev

# Reset database (development only)
yarn prisma migrate reset
```

## 🔐 Authentication & Authorization

### User Roles
- **Customer**: Basic marketplace access
- **Vendor**: Restaurant/business management
- **Driver**: Delivery and transport services
- **Admin**: Full system administration

### Authentication Flow
1. Email/password registration with verification
2. JWT token-based session management
3. Role-based access control (RBAC)
4. Protected API routes with middleware

### Security Features
- Password hashing with bcryptjs
- CSRF protection
- Rate limiting on sensitive endpoints
- Input sanitization and validation
- Secure HTTP headers

## 💾 Database Schema

### Core Models
- **User**: Customer, vendor, driver, and admin accounts
- **Restaurant**: Vendor restaurant information and settings
- **Product**: Menu items and inventory
- **Order**: Customer orders and order items
- **Delivery**: Delivery assignments and tracking
- **Payment**: Transaction and payment method records
- **Review**: Customer reviews and ratings

### Key Relationships
- Users can have multiple roles (customer + driver)
- Vendors manage multiple restaurants
- Orders contain multiple products from same vendor
- Deliveries link orders with drivers
- Payments track all financial transactions

## 🌐 API Documentation

### REST API Endpoints

#### Authentication
```
POST /api/auth/signup          # User registration
POST /api/auth/signin          # User login
POST /api/auth/signout         # User logout
GET  /api/auth/session         # Get current session
```

#### Marketplace
```
GET  /api/vendors              # List all vendors
GET  /api/vendors/:id          # Get vendor details
GET  /api/products             # List products with filters
GET  /api/products/:id         # Get product details
```

#### Orders
```
POST /api/orders               # Create new order
GET  /api/orders               # List user orders
GET  /api/orders/:id           # Get order details
PUT  /api/orders/:id           # Update order status
```

#### Payments
```
POST /api/payments/intent      # Create payment intent
POST /api/payments/confirm     # Confirm payment
GET  /api/payments/methods     # List payment methods
```

### WebSocket Events
```javascript
// Real-time order updates
socket.on('order:status_update', (data) => {
  // Handle order status changes
});

// Driver location updates
socket.on('driver:location_update', (data) => {
  // Handle driver location changes
});

// Real-time notifications
socket.on('notification:new', (data) => {
  // Handle new notifications
});
```

## 🎨 UI/UX Guidelines

### Design System
- **Color Palette**: Modern, accessible colors with dark mode support
- **Typography**: Inter font family with responsive text scaling
- **Spacing**: 8px grid system for consistent spacing
- **Components**: Reusable components with Tailwind CSS
- **Animations**: Subtle animations with Framer Motion

### Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- **Touch Friendly**: Large tap targets and gesture support
- **Performance**: Optimized images and lazy loading

### Accessibility
- **WCAG 2.1 AA** compliance
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: Meets accessibility contrast requirements

## 🚀 Deployment

### Production Deployment
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for comprehensive deployment instructions.

#### Quick Production Setup
```bash
# Clone repository
git clone https://github.com/your-username/africanmarket.git
cd africanmarket/app

# Set up environment
cp .env.production.template .env.production
# Edit .env.production with your values

# Build and deploy
docker-compose -f docker-compose.production.yml up -d
```

### Environment Variables
Required environment variables for production:
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
STRIPE_SECRET_KEY=...
CLOUDINARY_API_SECRET=...
SENDGRID_API_KEY=...
```

## 📊 Monitoring & Analytics

### Application Monitoring
- **Health Checks**: `/api/health` endpoint with detailed status
- **Error Tracking**: Sentry integration for error monitoring
- **Performance**: Real-time performance metrics collection
- **Uptime**: Automated uptime monitoring and alerting

### Business Analytics
- **Google Analytics 4**: User behavior and conversion tracking
- **Custom Metrics**: Business-specific analytics dashboard
- **Real-time Data**: Live order and user activity monitoring
- **Reports**: Automated daily, weekly, and monthly reports

## 🔧 Testing

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user journey testing
- **Performance Tests**: Load and stress testing

### Running Tests
```bash
# Run all tests
yarn test

# Run specific test file
yarn test components/auth

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automatic code formatting
- **Husky**: Pre-commit hooks for linting and testing

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Maintenance Guide](./MAINTENANCE_GUIDE.md)
- [External Services Setup](./EXTERNAL_SERVICES.md)
- [Launch Strategy](./launch/launch-plan.md)

### Getting Help
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-username/africanmarket/issues)
- **Email Support**: support@africanmarket.com
- **Documentation**: [Full documentation site](https://docs.africanmarket.com)

### Community
- **Discord**: [Join our community](https://discord.gg/africanmarket)
- **Twitter**: [@AfricanMarket](https://twitter.com/africanmarket)
- **LinkedIn**: [AfricanMarket Company Page](https://linkedin.com/company/africanmarket)

---

## 🚧 Roadmap

### Version 2.0 (Q2 2024)
- [ ] Mobile applications (iOS/Android)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Subscription-based vendor plans
- [ ] Advanced driver routing algorithms

### Version 2.1 (Q3 2024)
- [ ] AI-powered recommendations
- [ ] Voice ordering capabilities
- [ ] Augmented reality menu browsing
- [ ] Blockchain-based loyalty program
- [ ] Advanced inventory management

---

*Built with ❤️ by the AfricanMarket team*
