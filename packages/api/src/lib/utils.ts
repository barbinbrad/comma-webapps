const utils = {
  stringify: (params: { [key: string]: any }): string => {
    return Object.keys(params)
      .map((key) => `${key}=${params[key]}`)
      .join("&");
  },
};

export default utils;
