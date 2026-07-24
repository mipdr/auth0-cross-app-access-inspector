import { useState } from "react";
import { SessionData } from "../../App";
import { parseErrorResponse, truncateToken } from "../../utils";
import { HttpRequestViewer } from "../HttpRequestViewer";
import { TokenResult } from "../TokenResult";

interface StepProps {
  sessionData: SessionData;
  refreshSessionData: () => Promise<void>;
}

const SamlStep2_RefreshToken = ({
  sessionData,
  refreshSessionData,
}: StepProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExchange = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/saml-rt-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        setError(await parseErrorResponse(response));
      } else {
        await refreshSessionData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !sessionData.samlAssertionB64;

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 ${isDisabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center mb-4">
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
            isDisabled ? "bg-gray-100" : "bg-orange-100"
          }`}
        >
          <span
            className={`font-semibold ${isDisabled ? "text-gray-400" : "text-orange-600"}`}
          >
            2
          </span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Exchange SAML Assertion for a Refresh Token
        </h2>
      </div>

      <p className="text-gray-600 mb-6">
        Exchange the base64-encoded SAML Assertion at the Enterprise IDP for a
        Refresh Token.
      </p>

      {sessionData.oktaTokenClientId && sessionData.samlAssertionB64 && (
        <div className="mb-6">
          <HttpRequestViewer
            content={`POST ${sessionData.oktaIssuer}/oauth2/v1/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange&
client_id=${sessionData.oktaTokenClientId}&
${
  sessionData.oktaAuthMethod === "private_key_jwt"
    ? `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&\nclient_assertion=[REDACTED]`
    : `client_secret=[REDACTED]`
}&
subject_token=${truncateToken(sessionData.samlAssertionB64)}&
subject_token_type=urn:ietf:params:oauth:token-type:saml2&
requested_token_type=urn:ietf:params:oauth:token-type:refresh_token&
scope=${sessionData.samlRtScope ?? "openid offline_access"}`}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <span className="text-red-700 text-sm whitespace-pre-wrap">
            {error}
          </span>
        </div>
      )}

      <button
        onClick={handleExchange}
        disabled={isDisabled || loading}
        className={`font-medium py-2 px-4 rounded-md transition duration-200 ${
          isDisabled || loading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-orange-600 hover:bg-orange-700 text-white"
        }`}
      >
        {loading ? "Exchanging..." : "Exchange SAML Assertion"}
      </button>

      {sessionData.samlRefreshToken && (
        <TokenResult
          label="Refresh Token:"
          token={sessionData.samlRefreshToken}
          successMessage="Refresh Token received!"
        />
      )}
    </div>
  );
};

export default SamlStep2_RefreshToken;
