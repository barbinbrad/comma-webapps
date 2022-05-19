import storage, { isAuthed } from "./storage";
import * as config from "./config";

// seed cache
function init() {
  const token = storage.getCommaAccessToken();
  return token;
}

function logOut() {
  storage.logOut();

  if (typeof window !== "undefined") {
    window.location.href = window.location.origin;
  }
}

function isAuthenticated() {
  return isAuthed;
}

export { storage, config };
export default { init, logOut, isAuthenticated };
