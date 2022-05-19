import crossFetch from "cross-fetch";
import { DEFAULT_HEADERS } from "./constants";
import RequestError from "./error";
import utils from "./utils";

export default class CommaAPI {
  url: string;

  headers: { [key: string]: string };

  shouldThrowOnError?: boolean;

  /**
   * Creates a CommaAPI client.
   *
   * @param url  URL of the Comma API endpoint.
   * @param headers  Custom headers.

   */
  constructor(
    url: string,
    {
      headers = {},
    }: {
      headers?: { [key: string]: string };
    } = {}
  ) {
    this.url = url;
    this.headers = { ...DEFAULT_HEADERS, ...headers };
  }

  configure(accessToken: string) {
    this.headers.Authorization = `JWT ${accessToken}`;
  }

  get(url: string, data: { [key: string]: any } = {}) {
    const parameterizedUrl =
      Object.keys(data).length === 0 ? url : `${url}?${utils.stringify(data)}`;

    return this.fetchJson(parameterizedUrl, {});
  }

  post(url: string, data: { [key: string]: any } = {}) {
    return this.fetchJson(url, {
      body: JSON.stringify(data),
      method: "POST",
    });
  }

  postForm(url: string, data: { [key: string]: any } = {}) {
    const parameterizedUrl = utils.stringify(data);
    return this.fetchJson(parameterizedUrl, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  }

  del(url: string, data: { [key: string]: any } = {}) {
    return this.fetchJson(url, {
      body: JSON.stringify(data),
      method: "DELETE",
    });
  }

  put(url: string, data: { [key: string]: any } = {}) {
    return this.fetchJson(url, {
      body: JSON.stringify(data),
      method: "PUT",
    });
  }

  patch(url: string, data: { [key: string]: any } = {}) {
    return this.fetchJson(url, {
      body: JSON.stringify(data),
      method: "PATCH",
    });
  }

  stream(url: string) {
    const data = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };
    return this.fetch(url, data);
  }

  fetchJson(url: string, data: { [key: string]: any } = {}) {
    return new Promise((resolve, reject) => {
      this.fetch(url, data)
        .then(async (response) => {
          if (response.ok) {
            return response
              .json()
              .then((json) => resolve(json))
              .catch((err) =>
                reject(new RequestError(response, err.toString()))
              );
          }
          const error = await response.text();
          throw new RequestError(response, `${response.status}: ${error}`);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  fetch(url: string, params = {}) {
    const options = {
      ...this.headers,
      ...params,
    };

    // native call
    return crossFetch(url, options);
  }
}
