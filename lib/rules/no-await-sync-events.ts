import { ESLintUtils, TSESTree } from '@typescript-eslint/experimental-utils';
import { getDocsUrl, SYNC_EVENTS } from '../utils';
import { isObjectExpression, isProperty, isIdentifier } from '../node-utils';
export const RULE_NAME = 'no-await-sync-events';
export type MessageIds = 'noAwaitSyncEvents';
type Options = [];

const SYNC_EVENTS_REGEXP = new RegExp(`^(${SYNC_EVENTS.join('|')})$`);
export default ESLintUtils.RuleCreator(getDocsUrl)<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unnecessary `await` for sync events',
      category: 'Best Practices',
      recommended: 'error',
    },
    messages: {
      noAwaitSyncEvents: '`{{ name }}` does not need `await` operator',
    },
    fixable: null,
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    // userEvent.type() is an exception, which returns a
    // Promise. But it is only necessary to wait when delay
    // option is specified. So this rule has a special exception
    // for the case await userEvent.type(element, 'abc', {delay: 1234})
    return {
      [`AwaitExpression > CallExpression > MemberExpression > Identifier[name=${SYNC_EVENTS_REGEXP}]`](
        node: TSESTree.Identifier
      ) {
        const memberExpression = node.parent as TSESTree.MemberExpression;
        const methodNode = memberExpression.property as TSESTree.Identifier;
        const callExpression = memberExpression.parent as TSESTree.CallExpression;
        const withDelay =
          callExpression.arguments.length >= 3 &&
          isObjectExpression(callExpression.arguments[2]) &&
          callExpression.arguments[2].properties.some(
            (property) =>
              isProperty(property) &&
              isIdentifier(property.key) &&
              property.key.name === 'delay'
          );

        if (
          !(
            node.name === 'userEvent' &&
            methodNode.name === 'type' &&
            withDelay
          )
        ) {
          context.report({
            node: methodNode,
            messageId: 'noAwaitSyncEvents',
            data: {
              name: `${node.name}.${methodNode.name}`,
            },
          });
        }
      },
    };
  },
});
