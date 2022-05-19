import CommaAPI from "./api";
import { COMMA_URL_ROOT } from "./constants";

const client = new CommaAPI(COMMA_URL_ROOT);

export function configure(accessToken: string) {
  client.configure(accessToken);
}

export default client;
