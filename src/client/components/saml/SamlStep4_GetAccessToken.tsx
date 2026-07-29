import { useState } from "react";
import { SessionData } from "../../App";
import { parseErrorResponse, truncateToken } from "../../utils";
import { HttpRequestViewer } from "../HttpRequestViewer";
import { TokenResult } from "../TokenResult";

interface StepProps {
  sessionData: SessionData;
  refreshSessionData: () => Promise<void>;
}

const SamlStep4_GetAccessToken = ({
  sessionData,
  refreshSessionData,
}: StepProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetAccessToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth0-jwt-bearer", {
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

  const isDisabled = !sessionData.idJagAssertion;

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 ${isDisabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center mb-4">
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
            isDisabled ? "bg-gray-100" : "bg-green-100"
          }`}
        >
          <span
            className={`font-semibold ${isDisabled ? "text-gray-400" : "text-green-600"}`}
          >
            4
          </span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Obtain Resource App Access Token
        </h2>
      </div>

      <p className="text-gray-600 mb-6">
        Exchange the ID-JAG Assertion at the Resource Application (Auth0) for an
        Access Token.
      </p>

      {sessionData.auth0ClientId && sessionData.idJagAssertion && (
        <div className="mb-6">
          <HttpRequestViewer
            content={`POST https://${sessionData.auth0Domain}/oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&
client_id=${sessionData.auth0ClientId}&
client_secret=[REDACTED]&
assertion=${truncateToken(sessionData.idJagAssertion)}${
              sessionData.auth0Resource
                ? `&
resource=${sessionData.auth0Resource}`
                : ""
            }`}
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
        onClick={handleGetAccessToken}
        disabled={isDisabled || loading}
        className={`font-medium py-2 px-4 rounded-md transition duration-200 ${
          isDisabled || loading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        {loading ? "Getting Token..." : "Get Access Token"}
      </button>

      {sessionData.accessToken && (
        <TokenResult
          label="Access Token:"
          token={sessionData.accessToken}
          successMessage="Auth0 Access Token received!"
          detailsLabel="Access Token Details"
          header={sessionData.accessTokenHeader}
          claims={sessionData.accessTokenClaims}
        />
      )}
    </div>
  );
};

export default SamlStep4_GetAccessToken;
