/**
 * @fileoverview prefer toBeDisabled or toBeEnabled over attribute checks
 * @author Ben Monro
 */
'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const rule = require('../../../lib/rules/prefer-enabled-disabled');

const RuleTester = require('eslint').RuleTester;

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
});
ruleTester.run('prefer-enabled-disabled', rule, {
  valid: [
    `expect(element).toBeDisabled()`,
    `expect(element).toHaveProperty('checked', true)`,
    // give me some code that won't trigger a warning
  ],

  invalid: [
    {
      code: "expect(element).toHaveProperty('disabled', true)",
      errors: [
        {
          message:
            "Use toBeDisabled() instead of toHaveProperty('disabled', true)",
        },
      ],
      output: 'expect(element).toBeDisabled()',
    },
    {
      code: "expect(element).toHaveProperty('disabled', false)",
      errors: [
        {
          message:
            "Use toBeEnabled() instead of toHaveProperty('disabled', false)",
        },
      ],
      output: 'expect(element).toBeEnabled()',
    },
    {
      code: "expect(element).toHaveAttribute('disabled', false)",
      errors: [
        {
          message:
            "Use toBeEnabled() instead of toHaveAttribute('disabled', false)",
        },
      ],
      output: 'expect(element).toBeEnabled()',
    },
    {
      code: "expect(element).toHaveProperty('disabled')",
      errors: [
        {
          message: "Use toBeDisabled() instead of toHaveProperty('disabled')",
        },
      ],
      output: 'expect(element).toBeDisabled()',
    },
    {
      code: "expect(element).toHaveAttribute('disabled')",
      errors: [
        {
          message: "Use toBeDisabled() instead of toHaveAttribute('disabled')",
        },
      ],
      output: 'expect(element).toBeDisabled()',
    },
  ],
});
