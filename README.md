# E-Voting Backend Service - Multi-Election Support

🎉 **Now supports multiple election types with flexible geographical hierarchies!**

## � Features

✨ **Modular Architecture**
- Refactored into 4 organized route modules for better maintainability
- Shared utilities prevent code duplication
- Clean separation of concerns

🎯 **Multi-Election Support**
- National Assembly elections
- Gup elections (district-level)
- Mangmi elections
- Tshogpa elections (village-level)
- Flexible geographical hierarchies

🔐 **Secure**
- JWT-based authentication
- Wallet-based transaction signing
- Role-based access control

📊 **Advanced Analytics**
- Location-based result aggregation
- Gender breakdown statistics
- Polling station analysis
- Hierarchical filtering support

📝 **Well-Documented**
- Interactive Swagger UI
- Comprehensive README files
- Architecture documentation

## 🚀 Quick Start

### Installation

Install the required packages:

```bash
pnpm install
# or
npm install
```

### Environment Setup

Create a `.env` file with:

```bash
AMOY_RPC_URL=
PRIVATE_KEY=
POLYGONSCAN_API_KEY=
SECRET_PHRASE=
CONTRACT_ADDRESS=
APP_ID=
APP_SECRET=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ACCESS_TOKEN_EXPIRES_IN=
REFRESH_TOKEN_EXPIRES_IN=

```

Generate a random secret phrase:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Start the Server

```bash
pnpm start
# or
npm start
```

Server will be available at:

- Local: `http://localhost:3001`
- API Docs: `http://localhost:3001/api-docs`

## 📚 Documentation

- **[Refactoring Summary](./REFACTORING_SUMMARY.md)** - Architecture overview and module descriptions
- **[Swagger UI](http://localhost:3001/api-docs)** - Interactive API documentation (when server is running)

## 🧪 Testing

Test the application:

```bash
npm start
# Server will be running at http://localhost:3001
# Access Swagger UI at http://localhost:3001/api-docs
```

## 📋 API Endpoints

All endpoints are under `/api/*` and organized by functionality:

### Candidate Management
| Endpoint          | Method | Auth | Description                          |
|-------------------|--------|------|--------------------------------------|
| `/api/register`   | POST   | ✅   | Register candidate                   |
| `/api/remove`     | DELETE | ✅   | Remove candidate                     |

### Voting Operations
| Endpoint          | Method | Auth | Description                          |
|-------------------|--------|------|--------------------------------------|
| `/api/vote`       | POST   | ✅   | Cast a vote                          |
| `/api/checkVoted` | GET    | ✅   | Check if user has voted              |

### Election Management
| Endpoint        | Method | Auth | Description              |
|-----------------|--------|------|--------------------------|
| `/api/end`      | POST   | ✅   | End an election          |
| `/api/elections`| GET    | ✅   | List all elections       |

### Results & Analytics
| Endpoint                   | Method | Auth | Description                                    |
|----------------------------|--------|------|------------------------------------------------|
| `/api/votesByElection`     | GET    | ✅   | Get detailed results with location filtering   |
| `/api/geographicalResults` | GET    | ✅   | Get votes aggregated by location               |
| `/api/demkhongResults`     | GET    | ✅   | Legacy endpoint (for backward compatibility)   |
| `/api/public-result/:id`   | GET    | ❌   | Public results (no authentication needed)      |

**Auth Column**: ✅ = Authentication required, ❌ = Public access

## 🔐 Authentication

All endpoints require JWT authentication. Include token in header:

```bash
Authorization: Bearer <your-jwt-token>
```

Get token from `/auth/login` endpoint.

## 📖 Quick Examples

### Register National Assembly Candidate

```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "electionId": "NA_2025",
    "candidate": "Tshering Dorji",
    "location": {
      "dzongkhag": "Thimphu",
      "demkhong": "Thimphu"
    },
    "electionType": "NATIONAL_ASSEMBLY"
  }'
```

### Register Tshogpa Candidate

```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "electionId": "TSHOGPA_2025",
    "candidate": "Pema Thinley",
    "location": {
      "dzongkhag": "Paro",
      "gewog": "Lungnyi",
      "chewog": "Tsento"
    },
    "electionType": "TSHOGPA"
  }'
```

### Cast Vote

```bash
curl -X POST http://localhost:3001/api/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "electionId": "NA_2025",
    "uid": "11234567890123",
    "candidate": "Tshering Dorji",
    "gender": "Male"
  }'
```

### Get Results

```bash
curl -X GET "http://localhost:3001/api/votesByElection?electionId=NA_2025&electionType=NATIONAL_ASSEMBLY" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

See [API_EXAMPLES.md](./API_EXAMPLES.md) for complete examples.

## 🏗️ Project Structure

```
evoting_backend/
├── services/
│   ├── index.js                      # Routes aggregator
│   ├── utils.js                      # Shared utilities (contract setup)
│   ├── routes/
│   │   ├── candidate.routes.js       # Candidate registration & removal
│   │   ├── vote.routes.js            # Voting operations
│   │   ├── election.routes.js        # Election management
│   │   └── results.routes.js         # Results retrieval & analytics
│   └── auth.js                       # Authentication & JWT tokens
├── auth/
│   └── auth.js                       # Auth middleware
├── utils/
│   ├── electionTypes.js              # Election type definitions & helpers
│   ├── logger.js                     # Winston logging utility
│   └── swagger-new.yaml              # API documentation
├── abi/
│   └── demkhongAbi.json              # Smart contract ABI
├── logs/                             # Application logs (auto-created)
├── app.js                            # Main application entry point
├── package.json                      # Dependencies
├── README.md                         # This file
└── REFACTORING_SUMMARY.md            # Architecture documentation
```

## 🛠️ Technology Stack

- **Node.js** with Express.js
- **Ethers.js** v6 for blockchain interaction
- **Polygon Amoy** testnet
- **JWT** for authentication
- **Winston** for logging
- **Swagger** for API documentation

## 🚢 Deployment

The backend can be deployed to any Node.js hosting platform:

1. Set environment variables
2. Run `pnpm install` or `npm install`
3. Run `pnpm start` or `npm start`

## 🐛 Troubleshooting

### Server won't start

- Check `.env` file has all required variables
- Verify RPC URL is accessible
- Ensure port 3001 is not in use
- Check for syntax errors: `node --check app.js`

### Module import errors

- Verify all route files exist in `/services/routes/`
- Check relative import paths in route files
- Ensure `/services/index.js` is properly aggregating all routes

### Transactions failing

- Check wallet has sufficient MATIC for gas
- Verify contract address is correct
- Ensure you're using the contract owner's private key
- Check transaction status on [Polygon Amoy Scan](https://amoy.polygonscan.com)

### Results not showing

- Wait a few seconds after registration/voting for blockchain confirmation
- Verify electionId matches exactly (case-sensitive)
- Check that candidates are registered before voting

## 🏗️ Architecture Overview

### Modular Service Design

The application uses a **route-based modular architecture** for better maintainability:

```
services/
├── index.js                   # Aggregates all routes
├── utils.js                   # Shared contract & utilities
└── routes/
    ├── candidate.routes.js    # Register/Remove endpoints
    ├── vote.routes.js         # Voting endpoints
    ├── election.routes.js     # Election management endpoints
    └── results.routes.js      # Results & analytics endpoints
```

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Easy to locate specific functionality
- ✅ Reduced file size (max 400 lines per file)
- ✅ No code duplication
- ✅ Easier testing and debugging

### Authentication Flow

1. Client requests JWT token from `/auth/token` endpoint
2. Server validates credentials and issues access + refresh tokens
3. Client includes token in `Authorization: Bearer <token>` header
4. Middleware validates token on each request
5. Token can be refreshed using `/auth/refresh` endpoint

### Data Flow

```
Client Request
    ↓
Route Handler (candidate.routes.js, vote.routes.js, etc.)
    ↓
Business Logic (validation, blockchain calls)
    ↓
Shared Utils (contract instance, hashUid, logger)
    ↓
Smart Contract (via ethers.js)
    ↓
Polygon Amoy Testnet
    ↓
Response to Client
```

## 📞 Support

For detailed information:

- See [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for complete architecture documentation
- Check Swagger UI at `http://localhost:3001/api-docs` (when server is running)
- Review individual route files in `/services/routes/` for endpoint details
