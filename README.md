# Auth0 Cross App Access Inspector

The Auth0 Cross App Access (XAA) Inspector is a sample Node/React implementation of a Requesting Application
performing the Cross App Access flow to obtain an access token from a Resource Application which uses
Auth0 as its Authorization Server.

This implements the [Identity Assertion Authorization Grant](https://www.ietf.org/archive/id/draft-ietf-oauth-identity-assertion-authz-grant-00.html) protocol.

For more information, see the [Auth0 documentation](https://auth0.com/docs/xaa-resource-app).

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

Copy `.env.example` to `.env` and fill in the values. This flow involves several distinct clients across two
tenants, so each variable below names exactly which entity it refers to. The file is organized into five sections.

You must configure at least one enterprise IdP (OIDC or SAML). If both are configured, the UI toggle lets you
switch between them; if only one is, the app boots into it and disables the other.

#### 1. Server

**`APP_BASE_URL`** (required)
The base URL this Inspector app is served from, e.g. `http://localhost:3000`. Used to build the OIDC/SAML
redirect and callback URLs.

**`SESSION_SECRET`** (required)
A long, random string used to sign the session cookie. Any securely generated value works.

#### 2. Okta org authorization server

This is the authorization server that mints the **Identity Assertion JWT (ID-JAG)**. The token exchange needs a
client to authenticate with. A basic OIDC setup reuses the OIDC app client from Section 3, so the dedicated
token-exchange variables are only needed for **AI agent token exchange** or the **SAML flow**.

**`OKTA_ISSUER`** (required)
Your Okta org URL, e.g. `https://your-domain.okta.com` — the org authorization server that issues the ID-JAG.

**`OKTA_TOKEN_CLIENT_ID`** (optional)
Client ID of the dedicated **token-exchange client** — typically the **Okta AI Agent** registered under the
Resource Application's *Resource Connections* tab. If unset, the OIDC app's `OKTA_CLIENT_ID` (Section 3) is used
instead. Required for the SAML flow.

**`OKTA_TOKEN_SCOPE`** (optional, default `read write`)
Scopes requested in the ID Token → ID-JAG exchange (OIDC flow).

**`OKTA_AUTH_METHOD`** (optional, default `private_key_jwt`)
Token-endpoint auth method: `private_key_jwt` or `client_secret`. Okta AI Agents authenticate with
`private_key_jwt` (a signed JWT). Must be `private_key_jwt` for AI agent token exchange and for the SAML flow.

**`OKTA_PRIVATE_KEY`** / **`OKTA_PRIVATE_KEY_KID`** (required when `OKTA_AUTH_METHOD=private_key_jwt`)
The private key (PEM on one line with literal `\n`) and its key ID, taken from the Okta AI Agent registration.

#### 3. Enterprise IdP: OIDC

The Okta application that authenticates the user via OIDC. Leave this block commented for a SAML-only setup; the
OIDC flow is enabled as soon as both values are set.

**`OKTA_CLIENT_ID`** (required for the OIDC flow)
Client ID of the **Okta OIDC application** used to sign the user in.

**`OKTA_CLIENT_SECRET`** (required for the OIDC flow)
Client secret of that same Okta OIDC application.

#### 4. Enterprise IdP: SAML

The Okta SAML application that authenticates the user. Leave this block commented for an OIDC-only setup; the SAML
flow is enabled as soon as `SAML_IDP_SSO_URL` and `SAML_IDP_CERT` are set. SAML only authenticates the user — the
token exchanges still use the token-exchange client from Section 2, which **must** be an Okta AI Agent
(`OKTA_AUTH_METHOD=private_key_jwt`); a client secret will not work.

**`SAML_SP_ENTITY_ID`** (required for the SAML flow)
The Service Provider entity ID for this app; must match the *SP Entity ID* configured in the Okta SAML app,
e.g. `http://localhost:3000/saml/metadata`.

**`SAML_SP_ACS_URL`** (required for the SAML flow)
The Assertion Consumer Service URL where Okta posts the SAMLResponse, e.g. `http://localhost:3000/saml/callback`.

**`SAML_IDP_SSO_URL`** (required for the SAML flow)
The IdP single sign-on URL, taken from the Okta SAML app's *Sign On* details.

**`SAML_IDP_ISSUER`** (required for the SAML flow)
The IdP entity ID / issuer, e.g. `http://www.okta.com/xxxxxxxx`.

**`SAML_IDP_CERT`** (required for the SAML flow)
The IdP signing certificate (PEM on one line with literal `\n`), used to validate the SAML response signature.

**`SAML_RT_SCOPE`** (optional, default `openid offline_access`)
Scope for the SAML Assertion → Refresh Token exchange.

**`SAML_IDJAG_SCOPE`** (optional, default `read:item`)
Scope for the Refresh Token → ID-JAG exchange.

#### 5. Auth0 (Resource Application)

The Auth0 tenant acting as the Resource Application's authorization server, and the **Requesting Application**
registered within it.

**`AUTH0_DOMAIN`** (required)
Your Auth0 tenant domain, e.g. `your-domain.auth0.com`.

**`AUTH0_CLIENT_ID`** (required)
Identifies the **Requesting Application** — the app initiating the Cross App Access flow (not the Okta clients
above) — to Auth0. This is either the `client_id` of a Requesting Application you registered in the Auth0
dashboard, **or** the HTTPS URL of a hosted **Client ID Metadata Document (CIMD)**. See
[Client ID Metadata Document (CIMD)](#client-id-metadata-document-cimd) below to use CIMD instead of a
pre-registered client.

**`AUTH0_CLIENT_SECRET`** (required for a pre-registered confidential client)
Client secret for that same Requesting Application registration. Leave it unset when `AUTH0_CLIENT_ID` is a CIMD
URL — the shipped document describes a public client, which has no secret.

**`AUTH0_AUDIENCE`** (required)
The API identifier (audience) of the **Resource Application API** registered in Auth0.

**`AUTH0_RESOURCE`** (optional)
When set, adds a `resource` parameter to the final access-token request, e.g. `https://your-resource-server`.

### 4. Run the Application

```bash
npm run dev
```

This starts the development server at `http://localhost:3000`.

## Client ID Metadata Document (CIMD)

Cross App Access is built for scenarios — AI agents especially — where a Requesting App shows up without having
been hand-registered in advance. To support this, Auth0 (as the Resource App authorization server) lets a client
identify itself with a **Client ID Metadata Document (CIMD)** instead of a pre-registered `client_id` + secret.

With CIMD, the `client_id` **is an HTTPS URL** that resolves to a JSON document describing the client. When Auth0
receives a token request whose `client_id` is a URL, it dereferences the URL, reads the metadata, and treats the
document as the client registration — no dashboard registration step required. This follows the
[OAuth Client ID Metadata Document](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/)
draft. The specification forbids symmetric client secrets, so a CIMD client is either a public client
(`token_endpoint_auth_method: "none"`) or authenticates with `private_key_jwt` and a published `jwks_uri`.

### The document shipped in this repo

This repository ships a ready-to-use CIMD document at [`public/cimd.json`](./public/cimd.json). Because a CIMD document's
`client_id` field **must** exactly equal the URL it is served from, the file is pinned to its raw URL on the
default branch:

```
https://raw.githubusercontent.com/auth0-samples/auth0-cross-app-access-inspector/main/public/cimd.json
```

It describes the Inspector as a **public client** (`token_endpoint_auth_method: "none"`) using the
`urn:ietf:params:oauth:grant-type:jwt-bearer` grant — exactly the grant the Inspector uses to exchange the ID-JAG
for an Auth0 access token. If you fork or relocate the repository, update the `client_id` field so it matches the
new raw URL; otherwise Auth0 will reject the mismatch.

### Using it

Because Auth0 fetches the URL over the public internet, the document has to be reachable there (a localhost URL
won't work) — hosting it in the GitHub repo is what makes it dereferenceable. To use CIMD in the flow:

1. **Auth0 (Resource App)** — set `AUTH0_CLIENT_ID` to the CIMD URL above and leave `AUTH0_CLIENT_SECRET` unset.
   Enable CIMD-based clients for Cross App Access on your Auth0 tenant per the
   [Auth0 XAA documentation](https://auth0.com/docs/ai-agents-mcp/cross-app-access).
2. **Okta (Enterprise IdP)** — register the same CIMD URL as the Requesting App / AI Agent client identifier when
   configuring the Resource Connection, so the ID-JAG is issued to that client. See the
   [Okta Cross App Access documentation](https://help.okta.com/oie/en-us/content/topics/apps/apps-cross-app-access.htm).

The same document therefore configures both ends of the flow from a single hosted URL.

## Scripts

- `npm run dev` — start the dev server with hot reload.
- `npm run build` — build the client for production.
- `npm start` — run the server in production mode (expects a prior `npm run build`).

## LICENSE

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for more details.
