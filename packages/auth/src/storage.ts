export let isAuthed = false;

const storage = {
  keys: {
    token: "authorization",
    onboarding: "onboardingPath",
  },

  logOut() {
    window.localStorage.removeItem(storage.keys.token);
  },

  getCommaAccessToken() {
    const token = window.localStorage.getItem(storage.keys.token);
    isAuthed = !!token;
    return isAuthed ? token : null;
  },

  setCommaAccessToken(token: string) {
    window.localStorage.setItem(storage.keys.token, token);
    return storage.getCommaAccessToken();
  },
};

export default storage;
