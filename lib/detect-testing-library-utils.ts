import {
  ASTUtils,
  TSESLint,
  TSESTree,
} from '@typescript-eslint/experimental-utils';
import {
  getAssertNodeInfo,
  getImportModuleName,
  getPropertyIdentifierNode,
  getReferenceNode,
  hasImportMatch,
  ImportModuleNode,
  isImportDeclaration,
  isImportNamespaceSpecifier,
  isImportSpecifier,
  isLiteral,
  isMemberExpression,
  isProperty,
} from './node-utils';
import {
  ABSENCE_MATCHERS,
  ASYNC_UTILS,
  PRESENCE_MATCHERS,
  ALL_QUERIES_COMBINATIONS,
} from './utils';

export type TestingLibrarySettings = {
  'testing-library/utils-module'?: string;
  'testing-library/filename-pattern'?: string;
  'testing-library/custom-renders'?: string[];
};

export type TestingLibraryContext<
  TOptions extends readonly unknown[],
  TMessageIds extends string
> = Readonly<
  TSESLint.RuleContext<TMessageIds, TOptions> & {
    settings: TestingLibrarySettings;
  }
>;

export type EnhancedRuleCreate<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TRuleListener extends TSESLint.RuleListener = TSESLint.RuleListener
> = (
  context: TestingLibraryContext<TOptions, TMessageIds>,
  optionsWithDefault: Readonly<TOptions>,
  detectionHelpers: Readonly<DetectionHelpers>
) => TRuleListener;

// Helpers methods
type GetTestingLibraryImportNodeFn = () => ImportModuleNode | null;
type GetCustomModuleImportNodeFn = () => ImportModuleNode | null;
type GetTestingLibraryImportNameFn = () => string | undefined;
type GetCustomModuleImportNameFn = () => string | undefined;
type IsTestingLibraryImportedFn = () => boolean;
type IsValidFilenameFn = () => boolean;
type IsGetQueryVariantFn = (node: TSESTree.Identifier) => boolean;
type IsQueryQueryVariantFn = (node: TSESTree.Identifier) => boolean;
type IsFindQueryVariantFn = (node: TSESTree.Identifier) => boolean;
type IsSyncQueryFn = (node: TSESTree.Identifier) => boolean;
type IsAsyncQueryFn = (node: TSESTree.Identifier) => boolean;
type IsCustomQueryFn = (node: TSESTree.Identifier) => boolean;
type IsAsyncUtilFn = (node: TSESTree.Identifier) => boolean;
type IsFireEventMethodFn = (node: TSESTree.Identifier) => boolean;
type IsRenderUtilFn = (node: TSESTree.Identifier) => boolean;
type IsPresenceAssertFn = (node: TSESTree.MemberExpression) => boolean;
type IsAbsenceAssertFn = (node: TSESTree.MemberExpression) => boolean;
type CanReportErrorsFn = () => boolean;
type FindImportedUtilSpecifierFn = (
  specifierName: string
) => TSESTree.ImportClause | TSESTree.Identifier | undefined;
type IsNodeComingFromTestingLibraryFn = (
  node: TSESTree.MemberExpression | TSESTree.Identifier
) => boolean;

export interface DetectionHelpers {
  getTestingLibraryImportNode: GetTestingLibraryImportNodeFn;
  getCustomModuleImportNode: GetCustomModuleImportNodeFn;
  getTestingLibraryImportName: GetTestingLibraryImportNameFn;
  getCustomModuleImportName: GetCustomModuleImportNameFn;
  isTestingLibraryImported: IsTestingLibraryImportedFn;
  isValidFilename: IsValidFilenameFn;
  isGetQueryVariant: IsGetQueryVariantFn;
  isQueryQueryVariant: IsQueryQueryVariantFn;
  isFindQueryVariant: IsFindQueryVariantFn;
  isSyncQuery: IsSyncQueryFn;
  isAsyncQuery: IsAsyncQueryFn;
  isCustomQuery: IsCustomQueryFn;
  isAsyncUtil: IsAsyncUtilFn;
  isFireEventMethod: IsFireEventMethodFn;
  isRenderUtil: IsRenderUtilFn;
  isPresenceAssert: IsPresenceAssertFn;
  isAbsenceAssert: IsAbsenceAssertFn;
  canReportErrors: CanReportErrorsFn;
  findImportedUtilSpecifier: FindImportedUtilSpecifierFn;
  isNodeComingFromTestingLibrary: IsNodeComingFromTestingLibraryFn;
}

const DEFAULT_FILENAME_PATTERN = '^.*\\.(test|spec)\\.[jt]sx?$';

const FIRE_EVENT_NAME = 'fireEvent';
const RENDER_NAME = 'render';

/**
 * Enhances a given rule `create` with helpers to detect Testing Library utils.
 */
export function detectTestingLibraryUtils<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TRuleListener extends TSESLint.RuleListener = TSESLint.RuleListener
>(ruleCreate: EnhancedRuleCreate<TOptions, TMessageIds, TRuleListener>) {
  return (
    context: TestingLibraryContext<TOptions, TMessageIds>,
    optionsWithDefault: Readonly<TOptions>
  ): TSESLint.RuleListener => {
    let importedTestingLibraryNode: ImportModuleNode | null = null;
    let importedCustomModuleNode: ImportModuleNode | null = null;

    // Init options based on shared ESLint settings
    const customModule = context.settings['testing-library/utils-module'];
    const filenamePattern =
      context.settings['testing-library/filename-pattern'] ??
      DEFAULT_FILENAME_PATTERN;
    const customRenders = context.settings['testing-library/custom-renders'];

    /**
     * Small method to extract common checks to determine whether a node is
     * related to Testing Library or not.
     *
     * To determine whether a node is a valid Testing Library util, there are
     * two conditions to match:
     * - it's named in a particular way (decided by given callback)
     * - it's imported from valid Testing Library module (depends on aggressive
     *    reporting)
     */
    function isTestingLibraryUtil(
      node: TSESTree.Identifier,
      isUtilCallback: (identifierNode: TSESTree.Identifier) => boolean
    ): boolean {
      if (!isUtilCallback(node)) {
        return false;
      }

      if (isAggressiveModuleReportingEnabled()) {
        return true;
      }

      const referenceNode = getReferenceNode(node);
      const referenceNodeIdentifier = getPropertyIdentifierNode(referenceNode);

      return isNodeComingFromTestingLibrary(referenceNodeIdentifier);
    }

    /**
     * Determines whether aggressive module reporting is enabled or not.
     *
     * This aggressive reporting mechanism is considered as enabled when custom
     * module is not set, so we need to assume everything matching Testing
     * Library utils is related to Testing Library no matter from where module
     * they are coming from. Otherwise, this aggressive reporting mechanism is
     * opted-out in favour to report only those utils coming from Testing
     * Library package or custom module set up on settings.
     */
    const isAggressiveModuleReportingEnabled = () => !customModule;

    /**
     * Determines whether aggressive render reporting is enabled or not.
     *
     * This aggressive reporting mechanism is considered as enabled when custom
     * renders are not set, so we need to assume every method containing
     * "render" is a valid Testing Library `render`. Otherwise, this aggressive
     * reporting mechanism is opted-out in favour to report only `render` or
     * names set up on custom renders setting.
     */
    const isAggressiveRenderReportingEnabled = () =>
      !Array.isArray(customRenders) || customRenders.length === 0;

    // Helpers for Testing Library detection.
    const getTestingLibraryImportNode: GetTestingLibraryImportNodeFn = () => {
      return importedTestingLibraryNode;
    };

    const getCustomModuleImportNode: GetCustomModuleImportNodeFn = () => {
      return importedCustomModuleNode;
    };

    const getTestingLibraryImportName: GetTestingLibraryImportNameFn = () => {
      return getImportModuleName(importedTestingLibraryNode);
    };

    const getCustomModuleImportName: GetCustomModuleImportNameFn = () => {
      return getImportModuleName(importedCustomModuleNode);
    };

    /**
     * Determines whether Testing Library utils are imported or not for
     * current file being analyzed.
     *
     * By default, it is ALWAYS considered as imported. This is what we call
     * "aggressive reporting" so we don't miss TL utils reexported from
     * custom modules.
     *
     * However, there is a setting to customize the module where TL utils can
     * be imported from: "testing-library/utils-module". If this setting is enabled,
     * then this method will return `true` ONLY IF a testing-library package
     * or custom module are imported.
     */
    const isTestingLibraryImported: IsTestingLibraryImportedFn = () => {
      return (
        isAggressiveModuleReportingEnabled() ||
        !!importedTestingLibraryNode ||
        !!importedCustomModuleNode
      );
    };

    /**
     * Determines whether filename is valid or not for current file
     * being analyzed based on "testing-library/filename-pattern" setting.
     */
    const isValidFilename: IsValidFilenameFn = () => {
      const fileName = context.getFilename();
      return !!fileName.match(filenamePattern);
    };

    /**
     * Determines whether a given node is `get*` query variant or not.
     */
    const isGetQueryVariant: IsGetQueryVariantFn = (node) => {
      return /^get(All)?By.+$/.test(node.name);
    };

    /**
     * Determines whether a given node is `query*` query variant or not.
     */
    const isQueryQueryVariant: IsQueryQueryVariantFn = (node) => {
      return /^query(All)?By.+$/.test(node.name);
    };

    /**
     * Determines whether a given node is `find*` query variant or not.
     */
    const isFindQueryVariant: IsFindQueryVariantFn = (node) => {
      return /^find(All)?By.+$/.test(node.name);
    };

    /**
     * Determines whether a given node is sync query or not.
     */
    const isSyncQuery: IsSyncQueryFn = (node) => {
      return isGetQueryVariant(node) || isQueryQueryVariant(node);
    };

    /**
     * Determines whether a given node is async query or not.
     */
    const isAsyncQuery: IsAsyncQueryFn = (node) => {
      return isFindQueryVariant(node);
    };

    const isCustomQuery: IsCustomQueryFn = (node) => {
      return (
        (isSyncQuery(node) || isAsyncQuery(node)) &&
        !ALL_QUERIES_COMBINATIONS.includes(node.name)
      );
    };

    /**
     * Determines whether a given node is a valid async util or not.
     *
     * A node will be interpreted as a valid async util based on two conditions:
     * the name matches with some Testing Library async util, and the node is
     * coming from Testing Library module.
     *
     * The latter depends on Aggressive module reporting:
     * if enabled, then it doesn't matter from where the given node was imported
     * from as it will be considered part of Testing Library.
     * Otherwise, it means `custom-module` has been set up, so only those nodes
     * coming from Testing Library will be considered as valid.
     */
    const isAsyncUtil: IsAsyncUtilFn = (node) => {
      return isTestingLibraryUtil(node, (identifierNode) =>
        ASYNC_UTILS.includes(identifierNode.name)
      );
    };

    /**
     * Determines whether a given node is fireEvent method or not
     */
    const isFireEventMethod: IsFireEventMethodFn = (node) => {
      const fireEventUtil = findImportedUtilSpecifier(FIRE_EVENT_NAME);
      let fireEventUtilName: string | undefined;

      if (fireEventUtil) {
        fireEventUtilName = ASTUtils.isIdentifier(fireEventUtil)
          ? fireEventUtil.name
          : fireEventUtil.local.name;
      } else if (isAggressiveModuleReportingEnabled()) {
        fireEventUtilName = FIRE_EVENT_NAME;
      }

      if (!fireEventUtilName) {
        return false;
      }

      const parentMemberExpression:
        | TSESTree.MemberExpression
        | undefined = isMemberExpression(node.parent) ? node.parent : undefined;

      if (!parentMemberExpression) {
        return false;
      }

      // make sure that given node it's not fireEvent object itself
      if (
        [fireEventUtilName, FIRE_EVENT_NAME].includes(node.name) ||
        (ASTUtils.isIdentifier(parentMemberExpression.object) &&
          parentMemberExpression.object.name === node.name)
      ) {
        return false;
      }

      // check fireEvent.click() usage
      const regularCall =
        ASTUtils.isIdentifier(parentMemberExpression.object) &&
        parentMemberExpression.object.name === fireEventUtilName;

      // check testingLibraryUtils.fireEvent.click() usage
      const wildcardCall =
        isMemberExpression(parentMemberExpression.object) &&
        ASTUtils.isIdentifier(parentMemberExpression.object.object) &&
        parentMemberExpression.object.object.name === fireEventUtilName &&
        ASTUtils.isIdentifier(parentMemberExpression.object.property) &&
        parentMemberExpression.object.property.name === FIRE_EVENT_NAME;

      return regularCall || wildcardCall;
    };

    /**
     * Determines whether a given node is a valid render util or not.
     *
     * A node will be interpreted as a valid render based on two conditions:
     * the name matches with a valid "render" option, and the node is coming
     * from Testing Library module. This depends on:
     *
     * - Aggressive render reporting: if enabled, then every node name
     * containing "render" will be assumed as Testing Library render util.
     * Otherwise, it means `custom-modules` has been set up, so only those nodes
     * named as "render" or some of the `custom-modules` options will be
     * considered as Testing Library render util.
     * - Aggressive module reporting: if enabled, then it doesn't matter from
     * where the given node was imported from as it will be considered part of
     * Testing Library. Otherwise, it means `custom-module` has been set up, so
     * only those nodes coming from Testing Library will be considered as valid.
     */
    const isRenderUtil: IsRenderUtilFn = (node) => {
      return isTestingLibraryUtil(node, (identifierNode) => {
        if (isAggressiveRenderReportingEnabled()) {
          return identifierNode.name.toLowerCase().includes(RENDER_NAME);
        }

        return [RENDER_NAME, ...customRenders].includes(identifierNode.name);
      });
    };

    /**
     * Determines whether a given MemberExpression node is a presence assert
     *
     * Presence asserts could have shape of:
     *  - expect(element).toBeInTheDocument()
     *  - expect(element).not.toBeNull()
     */
    const isPresenceAssert: IsPresenceAssertFn = (node) => {
      const { matcher, isNegated } = getAssertNodeInfo(node);

      if (!matcher) {
        return false;
      }

      return isNegated
        ? ABSENCE_MATCHERS.includes(matcher)
        : PRESENCE_MATCHERS.includes(matcher);
    };

    /**
     * Determines whether a given MemberExpression node is an absence assert
     *
     * Absence asserts could have shape of:
     *  - expect(element).toBeNull()
     *  - expect(element).not.toBeInTheDocument()
     */
    const isAbsenceAssert: IsAbsenceAssertFn = (node) => {
      const { matcher, isNegated } = getAssertNodeInfo(node);

      if (!matcher) {
        return false;
      }

      return isNegated
        ? PRESENCE_MATCHERS.includes(matcher)
        : ABSENCE_MATCHERS.includes(matcher);
    };

    /**
     * Gets a string and verifies if it was imported/required by Testing Library
     * related module.
     */
    const findImportedUtilSpecifier: FindImportedUtilSpecifierFn = (
      specifierName
    ) => {
      const node = getCustomModuleImportNode() ?? getTestingLibraryImportNode();
      if (!node) {
        return null;
      }
      if (isImportDeclaration(node)) {
        const namedExport = node.specifiers.find(
          (n) => isImportSpecifier(n) && n.imported.name === specifierName
        );
        // it is "import { foo [as alias] } from 'baz'""
        if (namedExport) {
          return namedExport;
        }
        // it could be "import * as rtl from 'baz'"
        return node.specifiers.find((n) => isImportNamespaceSpecifier(n));
      } else {
        const requireNode = node.parent as TSESTree.VariableDeclarator;
        if (ASTUtils.isIdentifier(requireNode.id)) {
          // this is const rtl = require('foo')
          return requireNode.id;
        }
        // this should be const { something } = require('foo')
        const destructuring = requireNode.id as TSESTree.ObjectPattern;
        const property = destructuring.properties.find(
          (n) =>
            isProperty(n) &&
            ASTUtils.isIdentifier(n.key) &&
            n.key.name === specifierName
        );
        return (property as TSESTree.Property).key as TSESTree.Identifier;
      }
    };

    /**
     * Determines if file inspected meets all conditions to be reported by rules or not.
     */
    const canReportErrors: CanReportErrorsFn = () => {
      return isTestingLibraryImported() && isValidFilename();
    };

    /**
     * Determines whether a node is imported from a valid Testing Library module
     *
     * This method will try to find any import matching the given node name,
     * and also make sure the name is a valid match in case it's been renamed.
     */
    const isNodeComingFromTestingLibrary: IsNodeComingFromTestingLibraryFn = (
      node
    ) => {
      const identifierName: string | undefined = getPropertyIdentifierNode(node)
        .name;

      const importNode = findImportedUtilSpecifier(identifierName);

      if (!importNode) {
        return false;
      }

      return hasImportMatch(importNode, identifierName);
    };

    const helpers: DetectionHelpers = {
      getTestingLibraryImportNode,
      getCustomModuleImportNode,
      getTestingLibraryImportName,
      getCustomModuleImportName,
      isTestingLibraryImported,
      isValidFilename,
      isGetQueryVariant,
      isQueryQueryVariant,
      isFindQueryVariant,
      isSyncQuery,
      isAsyncQuery,
      isCustomQuery,
      isAsyncUtil,
      isFireEventMethod,
      isRenderUtil,
      isPresenceAssert,
      isAbsenceAssert,
      canReportErrors,
      findImportedUtilSpecifier,
      isNodeComingFromTestingLibrary,
    };

    // Instructions for Testing Library detection.
    const detectionInstructions: TSESLint.RuleListener = {
      /**
       * This ImportDeclaration rule listener will check if Testing Library related
       * modules are imported. Since imports happen first thing in a file, it's
       * safe to use `isImportingTestingLibraryModule` and `isImportingCustomModule`
       * since they will have corresponding value already updated when reporting other
       * parts of the file.
       */
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // check only if testing library import not found yet so we avoid
        // to override importedTestingLibraryNode after it's found
        if (
          !importedTestingLibraryNode &&
          /testing-library/g.test(node.source.value as string)
        ) {
          importedTestingLibraryNode = node;
        }

        // check only if custom module import not found yet so we avoid
        // to override importedCustomModuleNode after it's found
        if (
          !importedCustomModuleNode &&
          String(node.source.value).endsWith(customModule)
        ) {
          importedCustomModuleNode = node;
        }
      },

      // Check if Testing Library related modules are loaded with required.
      [`CallExpression > Identifier[name="require"]`](
        node: TSESTree.Identifier
      ) {
        const callExpression = node.parent as TSESTree.CallExpression;
        const { arguments: args } = callExpression;

        if (
          !importedTestingLibraryNode &&
          args.some(
            (arg) =>
              isLiteral(arg) &&
              typeof arg.value === 'string' &&
              /testing-library/g.test(arg.value)
          )
        ) {
          importedTestingLibraryNode = callExpression;
        }

        if (
          !importedCustomModuleNode &&
          args.some(
            (arg) =>
              isLiteral(arg) &&
              typeof arg.value === 'string' &&
              arg.value.endsWith(customModule)
          )
        ) {
          importedCustomModuleNode = callExpression;
        }
      },
    };

    // update given rule to inject Testing Library detection
    const ruleInstructions = ruleCreate(context, optionsWithDefault, helpers);
    const enhancedRuleInstructions: TSESLint.RuleListener = {};

    const allKeys = new Set(
      Object.keys(detectionInstructions).concat(Object.keys(ruleInstructions))
    );

    // Iterate over ALL instructions keys so we can override original rule instructions
    // to prevent their execution if conditions to report errors are not met.
    allKeys.forEach((instruction) => {
      enhancedRuleInstructions[instruction] = (node) => {
        if (instruction in detectionInstructions) {
          detectionInstructions[instruction](node);
        }

        if (canReportErrors() && ruleInstructions[instruction]) {
          return ruleInstructions[instruction](node);
        }
      };
    });

    return enhancedRuleInstructions;
  };
}
