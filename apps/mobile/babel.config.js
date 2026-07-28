/**
 * Babel configuration for the Expo application.
 *
 * `babel-preset-expo` is what makes JSX, TypeScript, the React Native runtime and
 * expo-router's file-based routing work together. Metro reads this file; nothing else does.
 */
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
  };
};
