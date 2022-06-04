import { GITHUB_CLIENT_ID, GITHUB_REDIRECT_URL } from '~/config';

const github = {
  authorizeUrl: (route: string) => {
    const params: { [key: string]: string } = {
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_REDIRECT_URL,
      scope: 'user:email public_repo',
      state: JSON.stringify({ route }),
    };

    return `http://github.com/login/oauth/authorize?${Object.keys(params).map(
      (key) => `${key}=${params[key]}`,
    )}`;
  },
};

export default github;
