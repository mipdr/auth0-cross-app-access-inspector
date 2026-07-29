import 'express-session';

declare module 'express-session' {
  interface SessionData {
    idJagAssertion?: string;
    accessToken?: string;
    samlAssertionB64?: string;
    samlRefreshToken?: string;
    samlNameId?: string;
  }
}

declare global {
  namespace Express {
    interface User {
      profile: any;
      idToken: string;
    }
  }
}
