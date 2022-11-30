module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  modulePathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
  transformIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
};
