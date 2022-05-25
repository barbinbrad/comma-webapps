/* eslint-disable import/prefer-default-export */
type ModifyQueryParams = {
  add: { [key: string]: string };
  remove: string[];
};

function getUrlWithParams(params: { [key: string]: string }) {
  return `${window.location.origin + window.location.pathname}?${Object.keys(params)
    .map((k) => `${k}=${encodeURIComponent(decodeURIComponent(params[k]))}`)
    .join('&')}`;
}

export function modifyQueryParameters({ add = {}, remove = [] }: ModifyQueryParams) {
  const regex = /[?&]([^&#]+)=([^&#]*)/;
  const results = regex.exec(window.location.search);

  let params: { [key: string]: string } = {};
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

    params = { ...params, ...add };
  } else {
    params = add;
  }

  return getUrlWithParams(params);
}
