import { createRuleTester } from '../test-utils';
import rule, { RULE_NAME } from '../../../lib/rules/no-await-sync-events';
import { ASYNC_EVENTS } from '../../../lib/utils';

const ruleTester = createRuleTester();

const fireEventFunctions = [
  'copy',
  'cut',
  'paste',
  'compositionEnd',
  'compositionStart',
  'compositionUpdate',
  'keyDown',
  'keyPress',
  'keyUp',
  'focus',
  'blur',
  'focusIn',
  'focusOut',
  'change',
  'input',
  'invalid',
  'submit',
  'reset',
  'click',
  'contextMenu',
  'dblClick',
  'drag',
  'dragEnd',
  'dragEnter',
  'dragExit',
  'dragLeave',
  'dragOver',
  'dragStart',
  'drop',
  'mouseDown',
  'mouseEnter',
  'mouseLeave',
  'mouseMove',
  'mouseOut',
  'mouseOver',
  'mouseUp',
  'popState',
  'select',
  'touchCancel',
  'touchEnd',
  'touchMove',
  'touchStart',
  'scroll',
  'wheel',
  'abort',
  'canPlay',
  'canPlayThrough',
  'durationChange',
  'emptied',
  'encrypted',
  'ended',
  'loadedData',
  'loadedMetadata',
  'loadStart',
  'pause',
  'play',
  'playing',
  'progress',
  'rateChange',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeUpdate',
  'volumeChange',
  'waiting',
  'load',
  'error',
  'animationStart',
  'animationEnd',
  'animationIteration',
  'transitionEnd',
  'doubleClick',
  'pointerOver',
  'pointerEnter',
  'pointerDown',
  'pointerMove',
  'pointerUp',
  'pointerCancel',
  'pointerOut',
  'pointerLeave',
  'gotPointerCapture',
  'lostPointerCapture',
];
const userEventFunctions = [
  'clear',
  'click',
  'dblClick',
  'selectOptions',
  'deselectOptions',
  'upload',
  // 'type',
  'tab',
  'paste',
  'hover',
  'unhover',
];
let eventFunctions: string[] = [];
ASYNC_EVENTS.forEach(event => {
  switch (event) {
    case 'fireEvent':
      eventFunctions = eventFunctions.concat(fireEventFunctions.map((f: string): string => `${event}.${f}`));
      break;
    case 'userEvent':
      eventFunctions = eventFunctions.concat(userEventFunctions.map((f: string): string => `${event}.${f}`));
      break;
    default:
      eventFunctions.push(`${event}.anyFunc`);
  }
});

ruleTester.run(RULE_NAME, rule, {
  valid: [
    // sync events without await are valid
    // userEvent.type() is an exception
    ...eventFunctions.map(func => ({
      code: `() => {
        ${func}('foo')
      }
      `,
    })),
    {
      code: `() => {
        userEvent.type('foo')
      }
      `,
    },
    {
      code: `() => {
        await userEvent.type('foo')
      }
      `,
    },
  ],

  invalid: [
    // sync events with await operator are not valid
    ...eventFunctions.map(func => ({
      code: `() => {
        await ${func}('foo')
      }
      `,
      errors: [
        {
          messageId: 'noAwaitSyncEvents',
        },
      ],
    })),
  ],
});
