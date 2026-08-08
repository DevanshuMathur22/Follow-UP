import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "caretrack_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return secret;
}

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

export function createSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    jwtSecret(),
    {
      algorithm: "HS256",
      expiresIn: SESSION_MAX_AGE,
    },
  );
}

export function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, jwtSecret(), {
      algorithms: ["HS256"],
    });

    if (
      !payload ||
      typeof payload !== "object" ||
      !validObjectId(payload.sub)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
