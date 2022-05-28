import DBC from '~/models/can';

export const GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY = 'gh_auth_token';

const storage = {
  fetchPersistedDBC(route: string) {
    const maybeDbc = window.localStorage.getItem(route);
    if (maybeDbc !== null) {
      const { dbcFilename, dbcText } = JSON.parse(maybeDbc);
      const dbc = new DBC(dbcText);

      return { dbc, dbcText, dbcFilename };
    }
    return null;
  },

  persistDbc(routeName: string, dbcFilename: string, dbc: DBC) {
    const dbcJson = JSON.stringify({
      dbcFilename,
      dbcText: dbc.text(),
    });
    window.localStorage.setItem(routeName, dbcJson);
  },

  fetchPersistedGithubAuthToken() {
    return window.localStorage.getItem(GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY) || undefined;
  },

  unpersistGithubAuthToken() {
    window.localStorage.removeItem(GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY);
  },

  persistGithubAuthToken(token: string) {
    return window.localStorage.setItem(GITHUB_AUTH_TOKEN_LOCALSTORAGE_KEY, token);
  },
};

export default storage;
