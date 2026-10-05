import express from "express";
import bcrypt from "bcrypt";

import passport from "../auth";
import { db } from "../db";

import {
  generateSlackState,
  getSlackAuthorizationUrl,
  exchangeSlackCode,
  saveSlackConnection,
} from "../slack";

const router = express.Router();

// ===============================
// GOOGLE AUTH
// ===============================

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:5173");
  }
);

// ===============================
// SLACK OAUTH
// ===============================

router.get(
  "/slack",
  (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        message: "You must be logged in first",
      });
    }

    const state = generateSlackState();

    // Store OAuth state in the existing session.
    (req.session as any).slackOAuthState =
      state;

    const authorizationUrl =
      getSlackAuthorizationUrl(state);

    res.redirect(authorizationUrl);
  }
);

router.get(
  "/slack/callback",
  async (req, res) => {
    try {
      const {
        code,
        state,
        error,
      } = req.query;

      if (error) {
        console.error(
          "Slack OAuth denied:",
          error
        );

        return res.redirect(
          "http://localhost:5173?slack=error"
        );
      }

      const savedState =
        (req.session as any)
          .slackOAuthState;

      if (
        !state ||
        !savedState ||
        state !== savedState
      ) {
        return res.status(400).send(
          "Invalid Slack OAuth state"
        );
      }

      delete (req.session as any)
        .slackOAuthState;

      if (
        typeof code !== "string"
      ) {
        return res.status(400).send(
          "Missing Slack OAuth code"
        );
      }

      if (!req.isAuthenticated()) {
        return res.status(401).send(
          "Your ReachInbox session has expired. Please log in again."
        );
      }

      const slackData =
        await exchangeSlackCode(code);

      const userId = (req.user as any).id;

      await saveSlackConnection(
        userId,
        slackData
      );

      console.log(
        `Slack connected for ReachInbox user ${userId}`
      );

      return res.redirect(
        "http://localhost:5173?slack=connected"
      );
    } catch (error) {
      console.error(
        "Slack OAuth callback failed:",
        error
      );

      return res.redirect(
        "http://localhost:5173?slack=error"
      );
    }
  }
);

// Check Slack connection
router.get(
  "/slack/status",
  async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          connected: false,
        });
      }

      const userId =
        (req.user as any).id;

      const [rows] =
        await db.execute(
          `SELECT
             team_name,
             channel_name,
             updated_at
           FROM slack_connections
           WHERE user_id = ?`,
          [userId]
        );

      const connection =
        (rows as any[])[0];

      return res.json({
        connected: Boolean(connection),
        teamName:
          connection?.team_name || null,
        channelName:
          connection?.channel_name || null,
      });
    } catch (error) {
      console.error(
        "Slack status error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to check Slack connection",
      });
    }
  }
);

// Disconnect Slack
router.post(
  "/slack/disconnect",
  async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      const userId =
        (req.user as any).id;

      await db.execute(
        `DELETE FROM slack_connections
         WHERE user_id = ?`,
        [userId]
      );

      return res.json({
        message:
          "Slack disconnected successfully",
      });
    } catch (error) {
      console.error(
        "Slack disconnect error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to disconnect Slack",
      });
    }
  }
);

// Check logged-in user
router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      authenticated: false,
    });
  }

  res.json({
    authenticated: true,
    user: req.user,
  });
});

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        message: "Logout failed",
      });
    }

    req.session.destroy(() => {
      res.json({
        message: "Logged out successfully",
      });
    });
  });
});

// ==========================================
// EMAIL/PASSWORD AUTH
// ==========================================

router.post("/email", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ==========================================
    // CHECK WHETHER EMAIL ALREADY EXISTS
    // ==========================================

    const [rows] = await db.execute(
      `SELECT id, google_id, name, email, password_hash, profile_picture
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    const users = rows as any[];

    // ==========================================
    // EXISTING USER
    // ==========================================

    if (users.length > 0) {
      const user = users[0];

      // This account was created using Google
      if (!user.password_hash) {
        return res.status(401).json({
          message:
            "This account uses Google login. Please continue with Google.",
        });
      }

      // Check whether password is correct
      const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
      );

      // Wrong password
      if (!passwordMatches) {
        return res.status(401).json({
          message: "Incorrect password",
        });
      }

      // Remove password hash before creating session
      delete user.password_hash;

      // Log existing user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);

          return res.status(500).json({
            message: "Login failed",
          });
        }

        return res.json({
          message: "Login successful",
          user,
        });
      });

      return;
    }

    // ==========================================
    // NEW USER
    // ==========================================

    const passwordHash = await bcrypt.hash(password, 12);

    // Since google_id is currently NOT NULL in MySQL,
    // create a unique local identifier for email users.
    const localGoogleId = `local_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    // Create new user
    const [result] = await db.execute(
      `INSERT INTO users
       (google_id, name, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [
        localGoogleId,
        normalizedEmail.split("@")[0],
        normalizedEmail,
        passwordHash,
      ]
    );

    const insertResult = result as any;

    // Fetch newly created user
    const [userRows] = await db.execute(
      `SELECT id, google_id, name, email, profile_picture
       FROM users
       WHERE id = ?`,
      [insertResult.insertId]
    );

    const newUser = (userRows as any[])[0];

    // Automatically log the new user in
    req.login(newUser, (err) => {
      if (err) {
        console.error("New user session error:", err);

        return res.status(500).json({
          message: "Account created but login failed",
        });
      }

      return res.status(201).json({
        message: "Account created successfully",
        user: newUser,
      });
    });
  } catch (error) {
    console.error("Email authentication error:", error);

    return res.status(500).json({
      message: "Authentication failed",
    });
  }
});

export default router;
