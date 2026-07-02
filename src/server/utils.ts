import { decodeJwt, importPKCS8, SignJWT } from "jose";
import { randomUUID } from "node:crypto";

export const decodeJwtSafely = (token: string) => {
  try {
    return decodeJwt(token);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

export const decodeJwtHeader = (token: string) => {
  try {
    const headerPart = token.split(".")[0];
    const decoded = Buffer.from(headerPart, "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to decode JWT header:", error);
    return null;
  }
};

export async function buildOktaClientAuth(): Promise<Record<string, string>> {
  const method = process.env.OKTA_AUTH_METHOD ?? "client_secret";

  if (method === "private_key_jwt") {
    const pem = process.env.OKTA_PRIVATE_KEY!.replace(/\\n/g, "\n");
    const kid = process.env.OKTA_PRIVATE_KEY_KID!;
    const clientId = process.env.OKTA_TOKEN_CLIENT_ID ?? process.env.OKTA_CLIENT_ID!;
    const tokenEndpoint = `${process.env.OKTA_ISSUER}/oauth2/v1/token`;

    const privateKey = await importPKCS8(pem, "RS256");
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({
      iss: clientId,
      sub: clientId,
      aud: tokenEndpoint,
      jti: randomUUID(),
      iat: now,
      exp: now + 300,
    })
      .setProtectedHeader({ alg: "RS256", kid })
      .sign(privateKey);

    return {
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
    };
  }

  return { client_secret: process.env.OKTA_CLIENT_SECRET! };
}
