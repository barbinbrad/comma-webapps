import * as React from 'react';
import CommaAuth, { config as AuthConfig, storage as AuthStorage } from 'auth';
import { auth as AuthApi, request as Request } from 'api';
import Cabana, { getPropsFromParams } from './Cabana';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const props = getPropsFromParams(params);
  React.useEffect(() => {
    authenticate();

    function authenticate() {
      if (window.location && window.location.pathname === AuthConfig.AUTH_PATH) {
        try {
          const code = params.get('code');
          const provider = params.get('provider');
          if (code && provider) {
            const token = AuthApi.refreshAccessToken(code, provider);
            if (token) {
              AuthStorage.setCommaAccessToken(token);

              // reset stored path
              if (window.sessionStorage) {
                const onboardingPath = window.sessionStorage.getItem(
                  AuthStorage.keys.onboardingPath,
                );
                if (onboardingPath) {
                  window.sessionStorage.removeItem(AuthStorage.keys.onboardingPath);
                  window.location.href = onboardingPath;
                }
              }
            }
          }
        } catch (err) {
          console.error(err);
        }
      }

      const token = CommaAuth.init();
      if (token) {
        Request.configure(token);
      }
    }
  }, []);

  return <Cabana {...props} />;
}
