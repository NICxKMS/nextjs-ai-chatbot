/**
 * TypeScript declarations for lib/editor/diff.js
 * Modified from https://github.com/hamflx/prosemirror-diff/blob/master/src/diff.js
 */

import type { Node, Schema } from "@tiptap/pm/model";

export const DiffType: {
    Unchanged: 0;
    Deleted: -1;
    Inserted: 1;
};

export type DiffTypeValue = -1 | 0 | 1;

export function patchDocumentNode(
    schema: Schema,
    oldNode: Node,
    newNode: Node
): Node;

export function patchTextNodes(
    schema: Schema,
    oldNode: Node,
    newNode: Node
): Node[];

export function computeChildEqualityFactor(node1: Node, node2: Node): number;

export function assertNodeTypeEqual(node1: Node, node2: Node): void;

export function ensureArray<T>(value: T | T[]): T[];

export function isNodeEqual(node1: Node, node2: Node): boolean;

export function normalizeNodeContent(node: Node): (Node | string)[];

export function getNodeProperty(node: Node, property: string): unknown;

export function getNodeAttribute(node: Node, attribute: string): unknown;

export function getNodeAttributes(node: Node): Record<string, unknown>;

export function getNodeMarks(node: Node): unknown[];

export function getNodeChildren(node: Node): Node[];

export function getNodeText(node: Node): string | undefined;

export function isTextNode(node: Node): boolean;

export function matchNodeType(node1: Node, node2: Node): boolean;

export function createNewNode(oldNode: Node, children: Node[]): Node;

export function createDiffNode(
    schema: Schema,
    node: Node,
    type: DiffTypeValue
): Node;

export function createDiffMark(schema: Schema, type: DiffTypeValue): unknown;

export function createTextNode(
    schema: Schema,
    content: string,
    marks?: unknown[]
): Node;

export function diffEditor(schema: Schema, oldDoc: Node, newDoc: Node): Node;
