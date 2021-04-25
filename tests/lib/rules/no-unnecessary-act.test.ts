import { createRuleTester } from '../test-utils';
import rule, { RULE_NAME } from '../../../lib/rules/no-unnecessary-act';

const ruleTester = createRuleTester();

/**
 * - AGR stands for Aggressive Reporting
 * - RTL stands for react-testing-library (@testing-library/react)
 * - RTU stands for react-test-utils (react-dom/test-utils)
 */
ruleTester.run(RULE_NAME, rule, {
  valid: [
    {
      code: `// case: RTL act wrapping non-RTL calls
      import { act } from '@testing-library/react'

      test('valid case', async () => {
        act(() => {
          stuffThatDoesNotUseRTL();
        });
        
        await act(async () => {
          stuffThatDoesNotUseRTL();
        });
        
        act(function() {
          stuffThatDoesNotUseRTL();
          const a = foo();
        });
        
        act(function() {
          return stuffThatDoesNotUseRTL();
        });
        
        act(() => stuffThatDoesNotUseRTL());
      });
      `,
    },
    {
      code: `// case: RTU act wrapping non-RTL
      import { act } from 'react-dom/test-utils'

      test('valid case', async () => {
        act(() => {
          stuffThatDoesNotUseRTL();
        });
        
        await act(async () => {
          stuffThatDoesNotUseRTL();
        });
        
        act(function() {
          stuffThatDoesNotUseRTL();
        });
        
        act(function() {
          return stuffThatDoesNotUseRTL();
        });
        
        act(() => stuffThatDoesNotUseRTL());
      });
      `,
    },
    {
      settings: {
        'testing-library/utils-module': 'test-utils',
      },
      code: `// case: RTL act wrapping non-RTL - AGR disabled
      import { act } from '@testing-library/react'
      import { waitFor } from 'somewhere-else'

      test('valid case', async () => {
        act(() => {
          waitFor();
        });
        
        await act(async () => {
          waitFor();
        });
        
        act(function() {
          waitFor();
        });
        
        act(function() {
          return waitFor();
        });
        
        act(() => waitFor());
      });
      `,
    },
    {
      code: `// case: RTL act wrapping both RTL and non-RTL calls
      import { act, render, waitFor } from '@testing-library/react'

      test('valid case', async () => {
        act(() => {
          render(<Foo />);
          stuffThatDoesNotUseRTL();
        });
        
        await act(async () => {
          waitFor();
          stuffThatDoesNotUseRTL();
        });
        
        act(function() {
          waitFor();
          stuffThatDoesNotUseRTL();
        });
      });
      `,
    },
  ],
  invalid: [
    {
      code: `// case: RTL act wrapping RTL calls - callbacks with body (BlockStatement)
      import { act, fireEvent, screen, render, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'

      test('invalid case', async () => {
        act(() => {
          fireEvent.click(el);
        });
        
        await act(async () => {
          waitFor(() => {});
        });
        
        await act(async () => {
          waitForElementToBeRemoved(el);
        });
        
        act(function() {
          const blah = screen.getByText('blah');
        });
        
        act(function() {
          render(something);
        });
        
        await act(() => {
          const button = findByRole('button')
        });

        act(() => {
          userEvent.click(el)
        });
        
        act(() => {
          waitFor();
          const element = screen.getByText('blah');
          userEvent.click(element)
        });
      });
      `,
      errors: [
        { messageId: 'noUnnecessaryActTestingLibraryUtil', line: 6, column: 9 },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 10,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 14,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 18,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 22,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 26,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 30,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 34,
          column: 9,
        },
      ],
    },

    {
      code: `// case: RTL act wrapping RTL calls - callbacks with return
      import { act, fireEvent, screen, render, waitFor } from '@testing-library/react'
      import userEvent from '@testing-library/user-event'

      test('invalid case', async () => {
        act(() => fireEvent.click(el))
        act(() => screen.getByText('blah'))
        act(() => findByRole('button'))
        act(() => userEvent.click(el))
        await act(async () => userEvent.type('hi', el))
        act(() => render(foo))
        await act(async () => render(fo))
        act(() => waitFor(() => {}))
        await act(async () => waitFor(() => {}))

        act(function () {
          return fireEvent.click(el);
        });
        act(function () {
          return screen.getByText('blah');
        });
        act(function () {
          return findByRole('button');
        });
        act(function () {
          return userEvent.click(el);
        });
        await act(async function () {
          return userEvent.type('hi', el);
        });
        act(function () {
          return render(foo);
        });
        await act(async function () {
          return render(fo);
        });
        act(function () {
          return waitFor(() => {});
        });
        await act(async function () {
          return waitFor(() => {});
        });
      });
      `,
      errors: [
        { messageId: 'noUnnecessaryActTestingLibraryUtil', line: 6, column: 9 },
        { messageId: 'noUnnecessaryActTestingLibraryUtil', line: 7, column: 9 },
        { messageId: 'noUnnecessaryActTestingLibraryUtil', line: 8, column: 9 },
        { messageId: 'noUnnecessaryActTestingLibraryUtil', line: 9, column: 9 },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 10,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 11,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 12,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 13,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 14,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 16,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 19,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 22,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 25,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 28,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 31,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 34,
          column: 15,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 37,
          column: 9,
        },
        {
          messageId: 'noUnnecessaryActTestingLibraryUtil',
          line: 40,
          column: 15,
        },
      ],
    },

    // TODO case: RTL act wrapping empty callback
    // TODO case: RTU act wrapping RTL calls - callbacks with body (BlockStatement)
    // TODO case: RTU act wrapping RTL calls - callbacks with return
    // TODO case: RTU act wrapping empty callback

    // TODO cases like previous ones but with AGR disabled
  ],
});
