import express from "express";

export function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  next();
}
