import express from "express";
import session from "express-session";
import passport from "passport";
import ViteExpress from "vite-express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import "./config/passport.js";
import "./config/saml.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.SESSION_SECRET) {
  console.error(
    "SESSION_SECRET is not set. Set it in your .env before starting the server.",
  );
  process.exit(1);
}

if (process.env.OKTA_AUTH_METHOD === "private_key_jwt") {
  const missing = ["OKTA_PRIVATE_KEY", "OKTA_PRIVATE_KEY_KID"].filter(
    (v) => !process.env[v],
  );
  if (missing.length) {
    console.error(
      `OKTA_AUTH_METHOD=private_key_jwt requires ${missing.join(", ")}. Set ${missing.length > 1 ? "them" : "it"} in your .env before starting the server.`,
    );
    process.exit(1);
  }
}

const app = express();

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/', authRoutes);
app.use('/api', apiRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
}

const port = parseInt(process.env.PORT || '3000', 10);

if (process.env.NODE_ENV === 'production') {
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
  });
} else {
  ViteExpress.listen(app, port, () => {
    console.log(`Server is listening on port ${port}...`);
  });
}
