import { useState } from "react";
import { truncateToken } from "../utils";
import { CopyButton } from "./CopyButton";
import { JsonViewer } from "./JsonViewer";

interface TokenResultProps {
  label: string;
  token: string;
  successMessage: string;
  detailsLabel?: string;
  header?: unknown;
  claims?: unknown;
}

// Shared success + token display block used by every exchange step. When a
// decoded JWT header/claims are provided it renders a collapsible details view.
export const TokenResult = ({
  label,
  token,
  successMessage,
  detailsLabel,
  header,
  claims,
}: TokenResultProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const hasDetails = Boolean(header || claims);

  return (
    <div className="mt-6">
      <div className="flex items-center text-green-600 mb-4">
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">{successMessage}</span>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <CopyButton text={token} />
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono break-all whitespace-pre-wrap">
            {truncateToken(token)}
          </pre>
        </div>

        {hasDetails && detailsLabel && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={showDetails ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"}
                />
              </svg>
              {showDetails ? `Hide ${detailsLabel}` : `Show ${detailsLabel}`}
            </button>

            {showDetails && (
              <div className="mt-4 space-y-4">
                {header != null && (
                  <JsonViewer data={header} title="JWT Header" />
                )}
                {claims != null && (
                  <JsonViewer data={claims} title="JWT Claims (Payload)" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
