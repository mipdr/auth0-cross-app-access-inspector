export const truncateToken = (token: string) => {
  if (token.length <= 60) return token;
  return `${token.substring(0, 30)}...${token.substring(token.length - 30)}`;
};

// Reads an error response body once as text, pretty-printing it when it parses
// as JSON. Falls back to the raw text so non-JSON responses (HTML 500 pages,
// proxy errors) show the actual failure instead of throwing a JSON parse error.
export const parseErrorResponse = async (
  response: Response,
): Promise<string> => {
  const raw = await response.text();
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw || `HTTP ${response.status} ${response.statusText}`;
  }
};
