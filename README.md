# Auth0 Cross App Access Inspector

The Auth0 Cross App Access (XAA) Inspector is a sample Node/React implementation of a Requesting Application
performing the Cross App Access flow to obtain an access token from a Resource Application which uses
Auth0 as its Authorization Server.

This implements the [Identity Assertion Authorization Grant](https://www.ietf.org/archive/id/draft-ietf-oauth-identity-assertion-authz-grant-00.html) protocol.

For more information, see the [Auth0 documentation](https://auth0.com/docs/xaa-resource-app).


> This sample app is a tool to test the Cross App Access end-to-end flow. Support of this flow is currently implemented by Auth0 as part of a private Beta program. To participate in this program, contact [Auth0 Support](http://support.auth0.com/) or your Technical Account Manager.

## Overview

The Inspector supports authenticating the user against the enterprise IdP with either an **OIDC** or a **SAML**
connection. Both can be configured at the same time, and the UI shows a toggle to switch between them. The token
exchange that mints the **Identity Assertion JWT (ID-JAG)** is always performed against Okta's **org authorization
server**; the final access token is then issued by the **Resource Application Authorization Server** (Auth0).

The app walks through the steps of the flow, showing the actual HTTP request and the resulting token at each step.

### OIDC flow

1. Authenticate with the user's Enterprise IdP (Okta) to obtain an ID Token.
2. **Exchange the ID Token for an ID-JAG** at Okta's org authorization server using the [RFC 8693 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693) protocol.
3. **Exchange the ID-JAG for an access token** at the Resource Application's authorization server (Auth0) using the [JWT-Bearer grant](https://datatracker.ietf.org/doc/html/rfc7523).
4. Use the Auth0 access token to call the Resource Application API.

### SAML flow

The SAML IdP is only used to authenticate the user; a trusted OIDC client — an **Okta AI Agent**, using **AI agent
token exchange** — performs the token exchanges.

1. Authenticate with the user's Enterprise SAML IdP; the signed `<Assertion>` is extracted from the SAML Response.
2. Exchange the SAML Assertion at Okta's org authorization server for a Refresh Token.
3. Exchange the Refresh Token for an ID-JAG scoped to the Resource Application's authorization server.
4. Exchange the ID-JAG for an access token at Auth0 (JWT-Bearer grant).
5. Use the Auth0 access token to call the Resource Application API.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Okta developer account
- Auth0 developer account

## Security Considerations

⚠️ **Important**: This application is for demonstration purposes only. In production, you should not expose
sensitive tokens like ID-JAG assertions to the frontend. Instead, keep them on the server side and use secure session storage.

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd auth0-cross-app-access-inspector
npm install
```

### 2. Configure the entities

Follow the Auth0 Cross App Access docs to set up the environment:

- [Cross App Access (XAA)](https://auth0.com/docs/xaa-resource-app) — overview of Auth0 as a Resource Application.
- [Environment setup](https://auth0.com/docs/secure/call-apis-on-users-behalf/xaa/set-up-xaa-test-environment) — configure the Auth0 tenant as the Resource App Authorization Server, register the API and Requesting App, and set up federation with the enterprise IdP.
- [Okta as OIDC IdP](https://auth0.com/docs/secure/call-apis-on-users-behalf/xaa/idp/okta-as-oidc-idp) — configure Okta as the enterprise IdP for XAA (OIN registration, app connections, and the Auth0 Okta Workforce enterprise connection).

You will configure:

- An **Auth0 tenant** acting as the Resource Application: an API to represent the Resource Application, a Requesting
  Application client with Cross App Access enabled, and an enterprise connection (OIDC or SAML) to Okta with XAA enabled.
- An **Okta org** acting as the enterprise IdP: an application to authenticate the user (OIDC or SAML), and — for
  AI agent token exchange or the SAML flow — an **Okta AI Agent** (authenticated with `private_key_jwt`, i.e. a
  signed **JWT with private key**) registered under the Resource Application's **Resource Connections** tab.

### 3. Environment Configuration

Copy `.env.example` to `.env` and fill in the values. The file is organized into sections:

- **Server** — `APP_BASE_URL` and a required `SESSION_SECRET`.
- **Okta org authorization server** — `OKTA_ISSUER` (always required) plus an optional dedicated token-exchange
  client. A basic OIDC setup needs no dedicated client: it reuses `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` from the
  OIDC block. A dedicated client is only required for **AI agent token exchange** (set `OKTA_AUTH_METHOD=private_key_jwt`,
  `OKTA_TOKEN_CLIENT_ID`, `OKTA_PRIVATE_KEY`, `OKTA_PRIVATE_KEY_KID`) or for the SAML flow.
- **Enterprise IdP: OIDC** — the commented `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` block. Uncomment it to enable the
  OIDC flow; leave it commented for a SAML-only setup.
- **Enterprise IdP: SAML** — the commented `SAML_*` block. Uncomment it to enable the SAML flow. Set at least
  `SAML_IDP_SSO_URL` and `SAML_IDP_CERT`.
- **Auth0** — `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`, and `AUTH0_SCOPE`.

You must configure at least one enterprise IdP (OIDC or SAML). If both are configured, the UI toggle lets you
switch between them; if only one is, the app boots into it and disables the other.

### 4. Run the Application

```bash
npm run dev
```

This starts the development server at `http://localhost:3000`.

## Scripts

- `npm run dev` — start the dev server with hot reload.
- `npm run build` — build the client for production.
- `npm start` — run the server in production mode (expects a prior `npm run build`).

## LICENSE

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for more details.
