import express from "express";
import {
  buildOktaClientAuth,
  decodeJwtHeader,
  decodeJwtSafely,
  parseErrorResponse,
} from "../utils.js";

const router = express.Router();

// Middleware to check authentication
const requireAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

router.post("/okta-token-exchange", requireAuth, async (req, res) => {
  try {
    const idToken = req.user?.idToken;

    if (!idToken) {
      return res.status(400).json({ error: "ID token not found in session" });
    }

    const clientAuth = await buildOktaClientAuth();
    const response = await fetch(`${process.env.OKTA_ISSUER}/oauth2/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: process.env.OKTA_TOKEN_CLIENT_ID ?? process.env.OKTA_CLIENT_ID!,
        ...clientAuth,
        subject_token: idToken,
        subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
        requested_token_type: "urn:ietf:params:oauth:token-type:id-jag",
        scope: process.env.OKTA_TOKEN_SCOPE ?? "read write",
        audience: `https://${process.env.AUTH0_DOMAIN!}/`,
      }),
    });

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      console.error("Error making token exchange request to Okta:", error);
      return res.status(400).json(error);
    }

    const tokenData = await response.json();

    req.session.idJagAssertion = tokenData.access_token;

    res.json({ success: true });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// SAML mode - Step 1: exchange the SAML assertion for a Refresh Token.
router.post("/saml-rt-exchange", requireAuth, async (req, res) => {
  try {
    const samlAssertionB64 = req.session?.samlAssertionB64;

    if (!samlAssertionB64) {
      return res
        .status(400)
        .json({ error: "SAML assertion not found in session" });
    }

    const clientAuth = await buildOktaClientAuth();
    const response = await fetch(`${process.env.OKTA_ISSUER}/oauth2/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: process.env.OKTA_TOKEN_CLIENT_ID ?? process.env.OKTA_CLIENT_ID!,
        ...clientAuth,
        subject_token: samlAssertionB64,
        subject_token_type: "urn:ietf:params:oauth:token-type:saml2",
        requested_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
        scope: process.env.SAML_RT_SCOPE ?? "openid offline_access",
      }),
    });

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      console.error("Error making SAML->RT exchange to Okta:", error);
      return res.status(400).json(error);
    }

    const tokenData = await response.json();
    req.session.samlRefreshToken = tokenData.access_token;
    res.json({ success: true });
  } catch (error) {
    console.error("SAML->RT exchange error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// SAML mode - Step 2: exchange the Refresh Token for an ID-JAG assertion.
router.post("/saml-idjag-exchange", requireAuth, async (req, res) => {
  try {
    const refreshToken = req.session?.samlRefreshToken;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ error: "Refresh token not found in session" });
    }

    const clientAuth = await buildOktaClientAuth();
    const response = await fetch(`${process.env.OKTA_ISSUER}/oauth2/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        client_id: process.env.OKTA_TOKEN_CLIENT_ID ?? process.env.OKTA_CLIENT_ID!,
        ...clientAuth,
        subject_token: refreshToken,
        subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
        requested_token_type: "urn:ietf:params:oauth:token-type:id-jag",
        audience: `https://${process.env.AUTH0_DOMAIN!}/`,
        scope: process.env.SAML_IDJAG_SCOPE ?? "read:item",
      }),
    });

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      console.error("Error making RT->ID-JAG exchange to Okta:", error);
      return res.status(400).json(error);
    }

    const tokenData = await response.json();
    req.session.idJagAssertion = tokenData.access_token;
    res.json({ success: true });
  } catch (error) {
    console.error("RT->ID-JAG exchange error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth0-jwt-bearer", requireAuth, async (req, res) => {
  try {
    const idJagAssertion = req.session?.idJagAssertion;

    if (!idJagAssertion) {
      return res
        .status(400)
        .json({ error: "ID-JAG assertion not found in session" });
    }

    const response = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          client_id: process.env.AUTH0_CLIENT_ID!,
          client_secret: process.env.AUTH0_CLIENT_SECRET!,
          assertion: idJagAssertion,
          ...(process.env.AUTH0_RESOURCE && {
            resource: process.env.AUTH0_RESOURCE,
          }),
        }),
      },
    );

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      console.error("Error making JWT Bearer exchange to Auth0:", error);
      return res.status(400).json(error);
    }

    const tokenData = await response.json();
    req.session.accessToken = tokenData.access_token;
    res.json({ success: true });
  } catch (error) {
    console.error("Auth0 token exchange error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// WARNING: For demonstration purposes only.
// In a production environment, sensitive data like the ID-JAG assertion should NOT be exposed to the frontend.
router.get("/inspector-debug", (req, res) => {
  const oidcConfigured = Boolean(
    process.env.OKTA_ISSUER &&
      process.env.OKTA_CLIENT_ID &&
      process.env.OKTA_CLIENT_SECRET,
  );
  const samlConfigured = Boolean(
    process.env.SAML_IDP_SSO_URL &&
      process.env.SAML_IDP_CERT &&
      process.env.SAML_SP_ENTITY_ID &&
      process.env.SAML_SP_ACS_URL,
  );

  if (!req.isAuthenticated()) {
    return res.json({ isAuthenticated: false, oidcConfigured, samlConfigured });
  }

  const user = req.user;
  const session = req.session;

  const samlAssertionXml = session?.samlAssertionB64
    ? Buffer.from(session.samlAssertionB64, "base64").toString("utf-8")
    : null;

  const idJagAssertionClaims = session?.idJagAssertion
    ? decodeJwtSafely(session.idJagAssertion)
    : null;
  const idJagAssertionHeader = session?.idJagAssertion
    ? decodeJwtHeader(session.idJagAssertion)
    : null;
  const accessTokenClaims = session?.accessToken
    ? decodeJwtSafely(session.accessToken)
    : null;
  const accessTokenHeader = session?.accessToken
    ? decodeJwtHeader(session.accessToken)
    : null;

  res.json({
    isAuthenticated: true,
    oidcConfigured,
    samlConfigured,
    user: {
      email: user?.profile?.email,
      name: user?.profile?.name,
      id: user?.profile?.id,
      username: user?.profile?.username,
    },
    idToken: user?.idToken,
    samlNameId: session?.samlNameId,
    samlAssertionB64: session?.samlAssertionB64,
    samlAssertionXml,
    samlRefreshToken: session?.samlRefreshToken,
    samlIdpSsoUrl: process.env.SAML_IDP_SSO_URL,
    samlSpEntityId: process.env.SAML_SP_ENTITY_ID,
    samlRtScope: process.env.SAML_RT_SCOPE ?? "openid offline_access",
    samlIdjagScope: process.env.SAML_IDJAG_SCOPE ?? "read:item",
    idJagAssertion: session?.idJagAssertion,
    idJagAssertionClaims,
    idJagAssertionHeader,
    accessToken: session?.accessToken,
    accessTokenClaims,
    accessTokenHeader,
    oktaClientId: process.env.OKTA_CLIENT_ID,
    oktaTokenClientId: process.env.OKTA_TOKEN_CLIENT_ID ?? process.env.OKTA_CLIENT_ID,
    oktaAuthMethod: process.env.OKTA_AUTH_METHOD ?? "client_secret",
    oktaTokenScope: process.env.OKTA_TOKEN_SCOPE ?? "read write",
    oktaIssuer: process.env.OKTA_ISSUER,
    auth0Domain: process.env.AUTH0_DOMAIN,
    auth0Audience: process.env.AUTH0_AUDIENCE,
    auth0ClientId: process.env.AUTH0_CLIENT_ID,
    auth0Resource: process.env.AUTH0_RESOURCE,
  });
});

export default router;
