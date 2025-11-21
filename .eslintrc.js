module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    '*.bundle.js',
    'vendor/*',
    'public/**/*',
    'client/dist/**/*',
    '**/vendor/*.js',
    '**/*.min.js',
    '**/*.bundle.js',
    '!.*.js' // Ne pas ignorer les fichiers de configuration commençant par un point
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'off' : 'warn',
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    'semi': ['error', 'always', { 'omitLastInOneLineBlock': true }],
    'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
    'no-prototype-builtins': 'off',
    'no-self-assign': 'off'
  },
  overrides: [
    {
      // Fichiers JavaScript
      files: ['**/*.js'],
      rules: {
        'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }]
      }
    },
    {
      // Fichiers de configuration
      files: ['*.config.js', '.*.js'],
      env: {
        node: true
      },
      rules: {
        'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
        'no-console': 'off',
        'semi': ['error', 'always']
      }
    }
  ]
};
