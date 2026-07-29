import { useState } from "react";
import { SessionData } from "../../App";
import { CopyButton } from "../CopyButton";
import { XmlViewer } from "../XmlViewer";

interface StepProps {
  session: SessionData;
  isLoading: boolean;
}

const SamlStep1_SignIn = ({ session, isLoading }: StepProps) => {
  const [showAssertion, setShowAssertion] = useState(false);
  const authenticated = !!session.samlAssertionB64;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-blue-600 font-semibold">1</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Authenticate with SAML IdP
          </h2>
        </div>

        {!isLoading && authenticated && (
          <a
            href="/logout"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </a>
        )}
      </div>

      <p className="text-gray-600 mb-6">
        Redirect the user to their enterprise SAML IdP. The signed SAML Response
        is posted back to the SP, and the enclosed{" "}
        <code className="bg-gray-100 px-1 rounded">&lt;Assertion&gt;</code> is
        extracted to be used as the subject token.
      </p>

      {isLoading && (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      )}

      {!isLoading && !authenticated && (
        <a
          href="/saml/login"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
        >
          Sign In with SAML IdP
        </a>
      )}

      {!isLoading && authenticated && (
        <div className="space-y-4">
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              Signed in as: {session.samlNameId}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                SAML Assertion (base64):
              </label>
              <CopyButton text={session.samlAssertionB64!} />
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
              {session.samlAssertionB64}
            </pre>
          </div>

          {session.samlAssertionXml && (
            <div>
              <button
                onClick={() => setShowAssertion(!showAssertion)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showAssertion ? "Hide Assertion XML" : "Show Assertion XML"}
              </button>

              {showAssertion && (
                <XmlViewer
                  xml={session.samlAssertionXml}
                  title="Decoded SAML Assertion"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SamlStep1_SignIn;
