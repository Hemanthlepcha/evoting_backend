# E-Voting Backend Service - Multi-Election Support

🎉 **Now supports multiple election types with flexible geographical hierarchies!**

## 🗳️ Supported Election Types

- **National Assembly** - Dzongkhag/Demkhong hierarchy
- **Gup Elections** - Dzongkhag/Gewog hierarchy
- **Mangmi Elections** - Dzongkhag/Gewog hierarchy
- **Tshogpa Elections** - Dzongkhag/Gewog/Chewog hierarchy

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

- **[API Examples](./API_EXAMPLES.md)** - Complete API usage examples for all election types
- **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)** - Technical architecture and data flow
- **[Swagger UI](http://localhost:3001/api-docs)** - Interactive API documentation

## 🧪 Testing

Run the comprehensive test suite:

```bash
node test_election_types.js
```

This will test:

- Candidate registration for all election types
- Vote casting
- Results retrieval
- Geographical aggregation
- Backward compatibility

## 🔑 Key Features

✅ **No Smart Contract Changes** - Works with your existing deployed contract  
✅ **Backward Compatible** - Old API calls still work  
✅ **Flexible Locations** - Supports demkhong, gewog, and chewog hierarchies  
✅ **Auto-Detection** - Automatically determines election type from location data  
✅ **Type Safety** - Validates location data for each election type

## 📋 API Endpoints

### Main Production Endpoint: `/api/*`

| Endpoint                   | Method | Description                                      |
| -------------------------- | ------ | ------------------------------------------------ |
| `/api/register`            | POST   | Register candidate (supports all election types) |
| `/api/vote`                | POST   | Cast a vote                                      |
| `/api/votesByElection`     | GET    | Get candidate results                            |
| `/api/geographicalResults` | GET    | Get votes by location                            |
| `/api/demkhongResults`     | GET    | Legacy endpoint (still works)                    |
| `/api/elections`           | GET    | List all elections                               |
| `/api/end`                 | POST   | End an election                                  |
| `/api/checkVoted`          | GET    | Check if user voted                              |
| `/api/public-result/:id`   | GET    | Public results (after election ends)             |

### Legacy Endpoints (Still Available)

- `/api-old/*` - Original API (contractService.js)
- `/api-v2/*` - Alternative API (new_contract.js)

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
Backend-for-Evoting-Smart-Contract/
├── services/
│   ├── auth.js                    # Authentication service
│   ├── demkhongAddedService.js    # Main API (multi-election support)
│   ├── contractService.js         # Legacy API
│   └── new_contract.js            # Alternative API
├── utils/
│   ├── electionTypes.js           # Election type definitions & helpers
│   ├── logger.js                  # Logging utility
│   └── swagger-new.yaml           # API documentation
├── abi/
│   └── demkhongAbi.json           # Smart contract ABI
├── app.js                         # Main application entry point
├── API_EXAMPLES.md                # Comprehensive API examples
├── IMPLEMENTATION_GUIDE.md        # Technical documentation
├── test_election_types.js         # Test suite
└── README.md                      # This file
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

No smart contract redeployment needed!

## 📝 Migration from Old Format

Your existing code will continue to work! To use new features:

**Old format:**

```javascript
{
  "demkhong": "Thimphu"
}
```

**New format (recommended):**

```javascript
{
  "location": {
    "dzongkhag": "Thimphu",
    "demkhong": "Thimphu"
  },
  "electionType": "NATIONAL_ASSEMBLY"
}
```

## 🐛 Troubleshooting

### Server won't start

- Check `.env` file has all required variables
- Verify RPC URL is accessible
- Ensure port 3001 is not in use

### Transactions failing

- Check wallet has sufficient MATIC for gas
- Verify contract address is correct
- Ensure you're using the contract owner's private key

### Results not showing

- Wait a few seconds after registration/voting for blockchain confirmation
- Check transaction on [Polygon Scan](https://amoy.polygonscan.com)
- Verify electionId matches exactly (case-sensitive)

## 📞 Support

For detailed information:

- See [API_EXAMPLES.md](./API_EXAMPLES.md) for usage examples
- See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for technical details
- Check Swagger UI at `http://localhost:3001/api-docs`

## 📄 License

[Your License Here]
