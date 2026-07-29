import passport from "passport";
import { Strategy as OpenIDConnectStrategy } from "passport-openidconnect";
import type { VerifyCallback } from "passport-openidconnect";

// Configure the OpenID Connect strategy for Okta. Only registered when OIDC is
// configured, so SAML-only setups still boot. Login uses the authorization-code
// grant, which always needs a real client secret; OKTA_AUTH_METHOD only affects
// the separate token-exchange calls, so it must not relax this requirement.
const oidcConfigured =
  process.env.OKTA_ISSUER &&
  process.env.OKTA_CLIENT_ID &&
  process.env.OKTA_CLIENT_SECRET;

if (oidcConfigured) {
  passport.use(
    new OpenIDConnectStrategy(
      {
        issuer: process.env.OKTA_ISSUER!,
        authorizationURL: `${process.env.OKTA_ISSUER}/oauth2/v1/authorize`,
        tokenURL: `${process.env.OKTA_ISSUER}/oauth2/v1/token`,
        userInfoURL: `${process.env.OKTA_ISSUER}/oauth2/v1/userinfo`,
        clientID: process.env.OKTA_CLIENT_ID!,
        clientSecret: process.env.OKTA_CLIENT_SECRET!,
        callbackURL: `${process.env.APP_BASE_URL}/login/callback`,
        scope: "openid profile email",
        skipUserProfile: true,
      },
      (
        _issuer: string,
        profile: object,
        _context: object,
        idToken: string | object,
        done: VerifyCallback,
      ) => {
        done(null, { profile, idToken: idToken as string });
      },
    ),
  );
} else {
  console.warn(
    "OIDC strategy not registered: OKTA_ISSUER / OKTA_CLIENT_ID / credentials missing.",
  );
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
