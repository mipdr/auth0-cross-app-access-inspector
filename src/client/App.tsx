import "./App.css";
import { useState, useEffect } from "react";
import Step1_SignIn from "./components/Step1_SignIn";
import Step2_TokenExchange from "./components/Step2_TokenExchange";
import Step3_GetAccessToken from "./components/Step3_GetAccessToken";
import Step4_CallAPI from "./components/Step4_CallAPI";
import SamlStep1_SignIn from "./components/saml/SamlStep1_SignIn";
import SamlStep2_RefreshToken from "./components/saml/SamlStep2_RefreshToken";
import SamlStep3_IdJag from "./components/saml/SamlStep3_IdJag";
import SamlStep4_GetAccessToken from "./components/saml/SamlStep4_GetAccessToken";
import { Header } from "./components/Header";

type IdpMode = "oidc" | "saml";

export interface SessionData {
  isAuthenticated: boolean;
  oidcConfigured?: boolean;
  samlConfigured?: boolean;
  user?: {
    username?: string;
  };
  idToken?: string;
  idTokenClaims?: any;
  samlNameId?: string;
  samlAssertionB64?: string;
  samlAssertionXml?: string;
  samlRefreshToken?: string;
  samlIdpSsoUrl?: string;
  samlSpEntityId?: string;
  samlRtScope?: string;
  samlIdjagScope?: string;
  idJagAssertion?: string;
  idJagAssertionClaims?: any;
  idJagAssertionHeader?: any;
  accessToken?: string;
  accessTokenClaims?: any;
  accessTokenHeader?: any;
  oktaClientId?: string;
  oktaTokenClientId?: string;
  oktaAuthMethod?: string;
  oktaTokenScope?: string;
  oktaIssuer?: string;
  auth0Domain?: string;
  auth0Audience?: string;
  auth0ClientId?: string;
  auth0HasClientSecret?: boolean;
  auth0Resource?: string;
}

function App() {
  const [sessionData, setSessionData] = useState<SessionData>({
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<IdpMode>(
    () => (localStorage.getItem("xaaMode") as IdpMode) || "oidc",
  );

  const changeMode = (next: IdpMode) => {
    localStorage.setItem("xaaMode", next);
    setMode(next);
  };

  const oidcConfigured = sessionData.oidcConfigured ?? true;
  const samlConfigured = sessionData.samlConfigured ?? true;
  const noIdpConfigured = !loading && !oidcConfigured && !samlConfigured;

  // If the persisted mode isn't configured, fall back to the one that is.
  useEffect(() => {
    if (mode === "saml" && !samlConfigured && oidcConfigured) {
      changeMode("oidc");
    } else if (mode === "oidc" && !oidcConfigured && samlConfigured) {
      changeMode("saml");
    }
  }, [mode, oidcConfigured, samlConfigured]);

  const refreshSessionData = async () => {
    try {
      setError(null);
      const response = await fetch("/api/inspector-debug");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server returned non-JSON response. Please check server configuration.",
        );
      }

      const data = await response.json();
      console.log("Session data received:", data);
      setSessionData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch session data";
      console.error("Failed to fetch session data:", err);
      setError(errorMessage);
      setSessionData({ isAuthenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSessionData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto min-h-[calc(100vh-4rem)]">
        <Header />

        {noIdpConfigured && (
          <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">
              No Identity Provider configured
            </h3>
            <p className="text-sm text-yellow-700">
              Neither an OIDC nor a SAML enterprise IdP is configured. Copy{" "}
              <code className="bg-yellow-100 px-1 rounded">.env.example</code>{" "}
              to <code className="bg-yellow-100 px-1 rounded">.env</code> and
              fill in at least one IdP block:
            </p>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>
                <span className="font-medium">OIDC:</span>{" "}
                <code className="bg-yellow-100 px-1 rounded">OKTA_ISSUER</code>,{" "}
                <code className="bg-yellow-100 px-1 rounded">
                  OKTA_CLIENT_ID
                </code>{" "}
                and a client secret (or{" "}
                <code className="bg-yellow-100 px-1 rounded">
                  OKTA_AUTH_METHOD=private_key_jwt
                </code>
                )
              </li>
              <li>
                <span className="font-medium">SAML:</span>{" "}
                <code className="bg-yellow-100 px-1 rounded">
                  SAML_IDP_SSO_URL
                </code>{" "}
                and{" "}
                <code className="bg-yellow-100 px-1 rounded">
                  SAML_IDP_CERT
                </code>
              </li>
            </ul>
          </div>
        )}

        {!noIdpConfigured && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
              <div className="relative group">
                <button
                  onClick={() => changeMode("oidc")}
                  disabled={!oidcConfigured}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition duration-200 ${
                    mode === "oidc"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  } ${!oidcConfigured ? "opacity-40 cursor-not-allowed hover:text-gray-600" : ""}`}
                >
                  OIDC IdP
                </button>
                {!oidcConfigured && (
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    OIDC flow is not configured
                  </span>
                )}
              </div>
              <div className="relative group">
                <button
                  onClick={() => changeMode("saml")}
                  disabled={!samlConfigured}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition duration-200 ${
                    mode === "saml"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  } ${!samlConfigured ? "opacity-40 cursor-not-allowed hover:text-gray-600" : ""}`}
                >
                  SAML IdP
                </button>
                {!samlConfigured && (
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    SAML flow is not configured
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-500">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Connection Error
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={refreshSessionData}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!noIdpConfigured && (
          <div className="space-y-8">
            {mode === "oidc" ? (
              <>
                <Step1_SignIn
                  session={sessionData}
                  isLoading={loading}
                  refreshSessionData={refreshSessionData}
                />
                <Step2_TokenExchange
                  sessionData={sessionData}
                  refreshSessionData={refreshSessionData}
                />
                <Step3_GetAccessToken
                  sessionData={sessionData}
                  refreshSessionData={refreshSessionData}
                />
                <Step4_CallAPI
                  session={sessionData}
                  isLoading={loading}
                  refreshSessionData={refreshSessionData}
                />
              </>
            ) : (
              <>
                <SamlStep1_SignIn session={sessionData} isLoading={loading} />
                <SamlStep2_RefreshToken
                  sessionData={sessionData}
                  refreshSessionData={refreshSessionData}
                />
                <SamlStep3_IdJag
                  sessionData={sessionData}
                  refreshSessionData={refreshSessionData}
                />
                <SamlStep4_GetAccessToken
                  sessionData={sessionData}
                  refreshSessionData={refreshSessionData}
                />
                <Step4_CallAPI
                  session={sessionData}
                  isLoading={loading}
                  refreshSessionData={refreshSessionData}
                  stepNumber={5}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
