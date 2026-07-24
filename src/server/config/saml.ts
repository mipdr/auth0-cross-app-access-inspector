import passport from "passport";
import type { Strategy as PassportStrategy } from "passport";
import { Strategy as SamlStrategy } from "@node-saml/passport-saml";
import type { Profile, VerifiedCallback } from "@node-saml/passport-saml";

// SAML strategy for the enterprise IdP. The strategy validates the response
// signature against SAML_IDP_CERT; we then keep the raw <Assertion> XML so it
// can be base64-encoded and used as the subject_token in the token exchange.
// Only registered when SAML is fully configured, so OIDC-only setups still boot
// and a partial SAML config doesn't crash the strategy constructor.
const samlConfigured = Boolean(
  process.env.SAML_IDP_SSO_URL &&
    process.env.SAML_IDP_CERT &&
    process.env.SAML_SP_ENTITY_ID &&
    process.env.SAML_SP_ACS_URL,
);

if (samlConfigured) {
  const strategy = new SamlStrategy(
    {
      entryPoint: process.env.SAML_IDP_SSO_URL,
      issuer: process.env.SAML_SP_ENTITY_ID!,
      callbackUrl: process.env.SAML_SP_ACS_URL!,
      idpCert: process.env.SAML_IDP_CERT!.replace(/\\n/g, "\n"),
      idpIssuer: process.env.SAML_IDP_ISSUER,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
    },
    (profile: Profile | null, done: VerifiedCallback) => {
      if (!profile) {
        return done(new Error("SAML profile missing"));
      }

      const assertionXml = profile.getAssertionXml?.() ?? "";

      const user = {
        samlNameId: profile.nameID,
        samlAssertionB64: assertionXml
          ? Buffer.from(assertionXml, "utf-8").toString("base64")
          : "",
      };

      return done(null, user);
    },
    // logout verify callback (unused, but required by the strategy signature)
    (_profile: Profile | null, done: VerifiedCallback) => done(null, {}),
  );

  passport.use("saml", strategy as unknown as PassportStrategy);
} else {
  console.warn(
    "SAML strategy not registered: SAML_IDP_SSO_URL / SAML_IDP_CERT / SAML_SP_ENTITY_ID / SAML_SP_ACS_URL missing.",
  );
}
