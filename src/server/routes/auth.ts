import express from "express";
import passport from "passport";

const router = express.Router();

// Login route - initiates OIDC authentication with Okta
router.get('/login', passport.authenticate('openidconnect'));

// Callback route - handles the redirect from Okta
router.get('/login/callback',
  passport.authenticate('openidconnect', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);

// SAML login - redirects to the enterprise SAML IdP
router.get('/saml/login', passport.authenticate('saml'));

// SAML ACS - the IdP posts the signed SAMLResponse here. The strategy validates
// the signature; on success we persist the extracted assertion into the session.
router.post(
  '/saml/callback',
  passport.authenticate('saml', { failureRedirect: '/', failureMessage: true }),
  (req, res) => {
    const user = req.user as { samlNameId?: string; samlAssertionB64?: string };
    req.session.samlNameId = user?.samlNameId;
    req.session.samlAssertionB64 = user?.samlAssertionB64;
    res.redirect('/');
  },
);

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('Session destroy error:', destroyErr);
      }
      res.redirect('/');
    });
  });
});

export default router;
