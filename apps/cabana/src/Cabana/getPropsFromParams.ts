import { demoProps } from '../data/demo';
import storage from '../services/localStorage';
import { Props } from './types';

export default function getPropsFromParams(params: URLSearchParams): Props {
  const p = {
    route: params.get('route'),
    demo: !!params.get('demo'),
    segments: params.get('segments'),
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

  return props;
}
