const utils = {
  stringify: (params: { [key: string]: any }): string => {
    return Object.keys(params)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
  },
};

export default utils;
