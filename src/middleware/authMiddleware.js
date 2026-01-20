import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    logger.warn(`Missing token for ${req.method} ${req.url}`);
    return res.status(401).json({ error: 'Authorization token required' });
  }

  jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      logger.warn(`Invalid token on ${req.method} ${req.url}: ${err.message}`);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next(); 
  });
};
