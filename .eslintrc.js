module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    'jest/globals': true,  // describe, test, expect
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    'jest',
  ],
  rules: {
    'max-len': ['warn', {
      code: 128,  // for GitHub
      ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true,
    }],
    indent: ['error', 2],
    semi: ['error', 'always'],
    quotes: ['warn', 'single', { avoidEscape: true }],
    'comma-dangle': ['warn', 'always-multiline'],
  },
};
