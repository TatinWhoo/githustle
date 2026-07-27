'use strict';

module.exports = [
  {
    // Apply to all JS files under server/src
    files: ['src/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'jsonwebtoken',
              message:
                'Import jsonwebtoken only from src/modules/auth/** or src/utils/jwt.js. ' +
                'Elsewhere, use the Auth_Provider_Interface (src/modules/auth/auth-provider.js).',
            },
          ],
        },
      ],
    },
  },
  {
    // Allow jsonwebtoken in the auth module and jwt util
    files: [
      'src/modules/auth/**/*.js',
      'src/utils/jwt.js',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
