module.exports = {
  ...require("config/eslint-library.js"),
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
};
