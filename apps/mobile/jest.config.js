// jest-expo preset for the React Native component layer (testing-strategy §2). transformIgnorePatterns
// is widened so the Expo/RN packages AND the @ingame/shared workspace package are transformed.
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@reduxjs/toolkit|redux-persist|react-redux|redux|immer|reselect|@ingame/.*))',
  ],
};
