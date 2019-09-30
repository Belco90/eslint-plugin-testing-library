# Disallow importing from DOM Testing Library

Ensure that there are no direct imports from `@testing-library/dom` or
`dom-testing-library` when using some testing library framework
wrapper.

## Rule Details

Testing Library framework wrappers as React Testing Library already
re-exports everything from DOM Testing Library so you always have to
import DOM Testing Library utils from corresponding framework wrapper
module to:

- use proper extended version of some of those methods containing
  additional functionality related to specific framework (e.g.
  `fireEvent` util)
- avoid importing from extraneous dependencies (similar to
  eslint-plugin-import)

This rule aims to prevent users from import anything directly from
`@testing-library/dom` (or `dom-testing-library`) and it's useful for
new starters or when IDEs autoimport from wrong module.

Examples of **incorrect** code for this rule:

```js
import { fireEvent } from 'dom-testing-library';
```

```js
import { fireEvent } from '@testing-library/dom';
```

```js
const { fireEvent } = require('dom-testing-library');
```

```js
const { fireEvent } = require('@testing-library/dom');
```

Examples of **correct** code for this rule:

```js
import { fireEvent } from 'react-testing-library';
```

```js
import { fireEvent } from '@testing-library/react';
```

```js
const { fireEvent } = require('react-testing-library');
```

```js
const { fireEvent } = require('@testing-library/react');
```

## Further Reading

- [Angular Testing Library API](https://testing-library.com/docs/angular-testing-library/api)
- [React Testing Library API](https://testing-library.com/docs/react-testing-library/api)
- [Vue Testing Library API](https://testing-library.com/docs/vue-testing-library/api)
