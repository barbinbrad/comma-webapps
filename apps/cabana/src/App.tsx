import Cabana, { getPropsFromParams } from './Cabana';
import useAuthentication from './hooks/useAuthentication';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const props = getPropsFromParams(params);

  useAuthentication(params);

  return <Cabana {...props} />;
}
