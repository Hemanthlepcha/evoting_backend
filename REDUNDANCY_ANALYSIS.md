# 🔍 Code Redundancy Analysis Report

## Summary
Found **multiple redundancies** in the codebase that can be safely removed or consolidated.

---

## 🔴 Critical Issues Found

### 1. **CORS Middleware Applied TWICE** ❌
**File**: `app.js` (Lines 33-44)

**Issue**: CORS is initialized twice:
```javascript
// First (unnecessary)
app.use(cors());

// Then again with specific config (correct)
app.use(cors({
  origin: [...],
  methods: [...]
}));
```

**Fix**: Remove the first generic `cors()` call, keep only the configured one.

---

### 2. **Unused Rate Limiting Middleware** ❌
**File**: `services/auth.js` (Lines 18-27)

**Issue**: Two rate limiters are defined but **never used**:
```javascript
// NEVER USED
const apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// NEVER USED  
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many login attempts, please try again later',
});
```

**Fix**: Delete both unused limiters

---

### 3. **Commented-Out Code** ❌
**File**: `app.js` (Line 31)

```javascript
//const swaggerDocument = YAML.load('./utils/swagger.yaml');
```

**Fix**: Remove commented code

---

### 4. **Duplicate Geographical Results Logic** ❌
**File**: `services/demkhongAddedService.js` (Lines 613-767)

**Issue**: Nearly identical code in two places:
- `/geographicalResults` endpoint (line 613)
- `geographicalResultsHandler()` function (line 700)

**Similarity**: ~95% duplicate logic - same contract calls, same error handling

**Fix**: Delete the duplicate handler function, consolidate into one endpoint

---

### 5. **Commented-Out Validation Code** ❌
**File**: `services/demkhongAddedService.js` (Lines 779-785)

```javascript
// const isEnded = await contract.isElectionEnded(electionId);
// if (!isEnded) {
//   logger.warn(
//     `Public result request denied - election not ended: ${electionId}`
//   );
//   return res.status(403).json({ message: "Election is not yet ended." });
// }
```

**Fix**: Remove commented code

---

### 6. **Unused console.log** ❌
**File**: `services/demkhongAddedService.js` (Line 323)

```javascript
console.log(`Fetching votes for election: ${electionId}`);
```

**Issue**: Uses `console.log` instead of `logger.info()` - inconsistent with rest of codebase

**Fix**: Replace with `logger.info()` or remove

---

### 7. **Unused Import** ⚠️
**File**: `services/auth.js` (Line 2)

```javascript
import rateLimit from 'express-rate-limit';
```

**Issue**: Imported but unused limiters defined. Import can stay for now but limiters should be removed.

---

## 📋 Unused Functions in Utils

**File**: `services/demkhongAddedService.js`

### Checked but USED:
- ✅ `buildLocationString()` - Used in multiple places
- ✅ `parseLocationString()` - Used in multiple places
- ✅ `normalizeElectionType()` - Used in multiple places
- ✅ `getRequiredLocationFields()` - Used in validation
- ✅ `detectElectionType()` - Used in registration
- ✅ `validateLocation()` - Used in registration
- ✅ `getLocationLabel()` - Used in /geographicalResults

All utility functions are actively used ✅

---

## 🎯 Action Items (Recommended Deletions)

| # | File | Lines | Type | Action |
|---|------|-------|------|--------|
| 1 | app.js | 33 | Duplicate middleware | Remove `app.use(cors());` |
| 2 | app.js | 31 | Dead code | Remove commented `YAML.load` |
| 3 | auth.js | 18-27 | Unused code | Delete both unused `rateLimit` definitions |
| 4 | demkhongAddedService.js | 700-767 | Duplicate function | Delete `geographicalResultsHandler()` and redirect `/demkhongResults` directly |
| 5 | demkhongAddedService.js | 779-785 | Dead code | Remove commented validation |
| 6 | demkhongAddedService.js | 323 | Wrong logger | Replace `console.log` with `logger.info` |

---

## 📊 Impact Analysis

### Safe to Delete (No Risk)
- ✅ Duplicate CORS middleware
- ✅ Unused rate limiters
- ✅ Commented code
- ✅ Duplicate handler function

### Medium Risk (Functional)
- ⚠️ `console.log` → `logger.info` (logging only, no functional change)

### Lines of Code Reduction
- **Before**: ~2,000+ lines across app.js, auth.js, demkhongAddedService.js
- **After**: ~1,950 lines (removing ~50 lines of redundancy)
- **Reduction**: ~2.5%

---

## 🚀 Priority

1. **HIGH**: Delete duplicate CORS & unused rate limiters (1-2 min fix)
2. **HIGH**: Delete duplicate handler function (5 min fix)
3. **MEDIUM**: Remove all commented code (2 min fix)
4. **MEDIUM**: Fix console.log to logger.info (1 min fix)

---

**Total cleanup time**: ~10 minutes  
**Risk level**: LOW - All changes are removals, no logic changes

Would you like me to **execute these cleanups**? ✅
