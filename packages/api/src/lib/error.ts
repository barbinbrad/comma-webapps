import { Response } from "cross-fetch";

export default class RequestError extends Error {
  resp: Response;

  constructor(resp: Response, ...params: any) {
    super(...params);
    this.resp = resp;
  }
}
