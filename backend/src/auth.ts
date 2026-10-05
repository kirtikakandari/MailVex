import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import dotenv from "dotenv";

dotenv.config();

// ===============================
// GOOGLE AUTHENTICATION
// ===============================

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails?.[0]?.value;
        const profilePicture = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(new Error("Google account has no email"));
        }

        const normalizedEmail = email.trim().toLowerCase();

        // ==========================================
        // STEP 1: CHECK GOOGLE ID
        // ==========================================

        const [googleRows] = await db.execute(
          `SELECT * FROM users WHERE google_id = ?`,
          [googleId]
        );

        const googleUsers = googleRows as any[];

        if (googleUsers.length > 0) {
          // Google account already exists
          return done(null, googleUsers[0]);
        }

        // ==========================================
        // STEP 2: CHECK EMAIL
        // ==========================================

        const [emailRows] = await db.execute(
          `SELECT * FROM users WHERE email = ?`,
          [normalizedEmail]
        );

        const emailUsers = emailRows as any[];

        if (emailUsers.length > 0) {
          // User already has an account with this email.
          // Connect their Google account to the existing user.

          const existingUser = emailUsers[0];

          await db.execute(
            `UPDATE users
             SET google_id = ?,
                 profile_picture = ?
             WHERE id = ?`,
            [googleId, profilePicture, existingUser.id]
          );

          // Fetch updated user
          const [updatedRows] = await db.execute(
            `SELECT * FROM users WHERE id = ?`,
            [existingUser.id]
          );

          const updatedUser = (updatedRows as any[])[0];

          return done(null, updatedUser);
        }

        // ==========================================
        // STEP 3: NEW GOOGLE USER
        // ==========================================

        const [result] = await db.execute(
          `INSERT INTO users
           (google_id, name, email, profile_picture)
           VALUES (?, ?, ?, ?)`,
          [
            googleId,
            name,
            normalizedEmail,
            profilePicture,
          ]
        );

        const insertResult = result as any;

        // Fetch newly created user
        const [newUserRows] = await db.execute(
          `SELECT * FROM users WHERE id = ?`,
          [insertResult.insertId]
        );

        const newUser = (newUserRows as any[])[0];

        return done(null, newUser);
      } catch (error) {
        console.error("Google authentication error:", error);

        return done(error as Error);
      }
    }
  )
);

// ==========================================
// STORE USER ID IN SESSION
// ==========================================

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// ==========================================
// RETRIEVE USER FROM DATABASE
// ==========================================

passport.deserializeUser(async (id: number, done) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, google_id, name, email, profile_picture
       FROM users
       WHERE id = ?`,
      [id]
    );

    const users = rows as any[];

    if (users.length === 0) {
      return done(null, false);
    }

    done(null, users[0]);
  } catch (error) {
    console.error("Session user lookup error:", error);

    done(error);
  }
});

export default passport;