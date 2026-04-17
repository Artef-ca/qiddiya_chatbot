import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || "supersecret";
  return secret;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateToken(payload: any) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}
