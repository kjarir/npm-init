# Professional Server Structure

A clean, scalable Node.js/Express server with proper file organization.

## Directory Structure

```
server/
├── index.js                 # Entry point, server initialization
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables (git ignored)
├── .env.example             # Example environment config
└── src/
    ├── config/              # Configuration files
    │   ├── db.js           # Database connection
    │   └── gemini.js       # Gemini AI config
    ├── middleware/          # Express middleware
    │   ├── errorHandler.js # Global error handling
    │   └── validator.js    # Request validation
    ├── modules/             # Feature modules
    │   └── escrow/
    │       ├── escrow.controller.js  # Business logic
    │       ├── escrow.model.js       # Database schema
    │       ├── escrow.prompts.js     # AI prompts
    │       └── escrow.routes.js      # API routes
    ├── services/            # Shared services
    │   └── ai.service.js   # AI integration service
    └── utils/               # Utility functions
        └── responseFormatter.js
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Run production server:**
   ```bash
   npm start
   ```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGO_URI` - MongoDB connection string
- `GEMINI_API_KEY` - Google Gemini AI API key
- `FRONTEND_URL` - Frontend URL for CORS

## API Endpoints

### Health Check
- `GET /` - API health status

### Escrow Module
- `POST /api/escrow/generate-description` - Generate project description
- `POST /api/escrow/generate-milestones` - Generate project milestones

## Features

✅ Professional file structure  
✅ Error handling & validation  
✅ Database connection with retry  
✅ AI service integration  
✅ CORS configuration  
✅ Environment-based configs  
✅ Proper logging  
✅ 404 & error middleware  

## Best Practices Implemented

- Modular architecture (controllers, services, models)
- Centralized error handling
- Input validation
- Proper status codes
- Consistent API responses
- Environment configuration
- Database connection management
- Graceful error recovery
