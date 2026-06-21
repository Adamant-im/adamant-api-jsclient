module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 250],
    'body-max-line-length': [0],
  },
};
