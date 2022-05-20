import { GITHUB_AUTH_TOKEN_KEY } from 'auth';
import { demoProps } from '../data/demo';
import storage from '../services/localStorage';
import { Props } from './types';

export default function getPropsFromParams(params: URLSearchParams): Props {
  const p = {
    route: params.get('route'),
    demo: !!params.get('demo'),
    segments: params.get('segments'),
    authToken: params.get(GITHUB_AUTH_TOKEN_KEY),
  };

  let segments;

  if (p.segments && p.segments.length) {
    segments = p.segments.split(',').map(Number);

    if (segments.length !== 2) {
      segments = undefined;
    }
  }

  let props: Props = {
    autoplay: true,
    startTime: Number(params.get('seekTime') || 0),
    segments,
    isDemo: p.demo,
    unlogger: !!params.get('unlogger'),
  };

  let persistedDbc = null;

  if (p.route) {
    const [dongleId, route] = p.route.split('|');
    props.dongleId = dongleId;
    props.name = route;

    persistedDbc = storage.fetchPersistedDBC(p.route);

    const max = params.get('max');
    const url = params.get('url');
    const exp = params.get('exp');
    const sig = params.get('sig');

    if (max) {
      props.max = parseInt(max, 10);
    }
    if (url) {
      props.url = url;
    }
    if (exp) {
      props.exp = exp;
    }
    if (sig) {
      props.sig = sig;
    }

    props.isLegacyShare = Boolean(max && url && !exp && !sig);
    props.isShare = Boolean(max && url && exp && sig);
  } else if (p.demo) {
    props = { ...props, ...demoProps };
  }

  if (persistedDbc) {
    const { dbcFilename, dbc } = persistedDbc;
    props.dbc = dbc;
    props.dbcFilename = dbcFilename;
  }

  if (p.authToken !== null) {
    props.githubAuthToken = p.authToken;
    storage.persistGithubAuthToken(p.authToken);
    const urlNoAuthToken = modifyQueryParameters({
      remove: [GITHUB_AUTH_TOKEN_KEY],
    });
    window.location.href = urlNoAuthToken;
  } else {
    props.githubAuthToken = storage.fetchPersistedGithubAuthToken();
  }

  return props;
}

type ModifyQueryParams = {
  remove: string[];
};

function modifyQueryParameters({ remove = [] }: ModifyQueryParams) {
  const regex = /[?&]([^&#]+)=([^&#]*)/;
  const results = regex.exec(window.location.search);

  const params: { [key: string]: string } = {};
  if (results != null) {
    for (let i = 1; i < results.length - 1; i += 2) {
      const key = results[i];
      const value = results[i + 1];
      params[key] = value;
    }
    Object.keys(params).forEach((key) => {
      if (remove.indexOf(key) !== -1) {
        delete params[key];
      }
    });
  }

  return `${window.location.origin + window.location.pathname}?${Object.keys(params)
    .map((k) => `${k}=${encodeURIComponent(decodeURIComponent(params[k]))}`)
    .join('&')}`;
}
