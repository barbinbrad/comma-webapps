import { useEffect } from 'react';
import Auth, { config as Config, storage as Storage } from 'auth';
import { auth as API, request as Request } from 'api';

export default function useAuthentication(params: URLSearchParams) {
  useEffect(() => {
    authenticate();

    function authenticate() {
      if (window.location && window.location.pathname === Config.AUTH_PATH) {
        try {
          const code = params.get('code');
          const provider = params.get('provider');
          if (code && provider) {
            const token = API.refreshAccessToken(code, provider);
            if (token) {
              Storage.setCommaAccessToken(token);

              // reset stored path
              if (window.sessionStorage) {
                const onboardingPath = window.sessionStorage.getItem(Storage.keys.onboardingPath);
                if (onboardingPath) {
                  window.sessionStorage.removeItem(Storage.keys.onboardingPath);
                  window.location.href = onboardingPath;
                }
              }
            }
          }
        } catch (err) {
          console.error(err);
        }
      }

      const token = Auth.init();
      if (token) {
        Request.configure(token);
      }
    }
  }, []);
}
