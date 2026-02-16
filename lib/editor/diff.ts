/**
 * ProseMirror Diff Utility
 *
 * Modified from https://github.com/hamflx/prosemirror-diff/blob/master/src/diff.js
 * Provides diff functionality for TipTap/ProseMirror documents.
 *
 * @module lib/editor/diff
 */

import type { Node as PMNode, Schema } from "@tiptap/pm/model"
import { Fragment, Node } from "@tiptap/pm/model"
import { diff_match_patch } from "diff-match-patch"

/**
 * Diff type constants
 */
export const DiffType = {
	Unchanged: 0,
	Deleted: -1,
	Inserted: 1,
} as const

export type DiffTypeValue = (typeof DiffType)[keyof typeof DiffType]

// Type for normalized content (mix of single nodes and arrays of text nodes)
type NormalizedContent = Array<PMNode | PMNode[]>

/**
 * Patch document node to compute diff between old and new versions
 */
export function patchDocumentNode(
	schema: Schema,
	oldNode: PMNode,
	newNode: PMNode,
): PMNode {
	assertNodeTypeEqual(oldNode, newNode)

	const finalLeftChildren: PMNode[] = []
	const finalRightChildren: PMNode[] = []

	const oldChildren = normalizeNodeContent(oldNode)
	const newChildren = normalizeNodeContent(newNode)
	const oldChildLen = oldChildren.length
	const newChildLen = newChildren.length
	const minChildLen = Math.min(oldChildLen, newChildLen)

	let left = 0
	let right = 0

	for (; left < minChildLen; left++) {
		const oldChild = oldChildren[left]!
		const newChild = newChildren[left]!
		if (!isNodeEqual(oldChild, newChild)) {
			break
		}
		finalLeftChildren.push(...ensureArray(oldChild))
	}

	for (; right + left + 1 < minChildLen; right++) {
		const oldChild = oldChildren[oldChildLen - right - 1]!
		const newChild = newChildren[newChildLen - right - 1]!
		if (!isNodeEqual(oldChild, newChild)) {
			break
		}
		finalRightChildren.unshift(...ensureArray(oldChild))
	}

	const diffOldChildren = oldChildren.slice(left, oldChildLen - right)
	const diffNewChildren = newChildren.slice(left, newChildLen - right)

	if (diffOldChildren.length && diffNewChildren.length) {
		const matchedNodes = matchNodes(
			schema,
			diffOldChildren,
			diffNewChildren,
		).sort((a, b) => b.count - a.count)
		const bestMatch = matchedNodes[0]
		if (bestMatch) {
			const { oldStartIndex, newStartIndex, oldEndIndex, newEndIndex } =
				bestMatch
			const oldBeforeMatchChildren = diffOldChildren.slice(
				0,
				oldStartIndex,
			)
			const newBeforeMatchChildren = diffNewChildren.slice(
				0,
				newStartIndex,
			)

			finalLeftChildren.push(
				...patchRemainNodes(
					schema,
					oldBeforeMatchChildren,
					newBeforeMatchChildren,
				),
			)
			// Push matched nodes as-is
			for (let i = oldStartIndex; i < oldEndIndex; i++) {
				const item = diffOldChildren[i]
				if (item) {
					if (Array.isArray(item)) {
						finalLeftChildren.push(...item)
					} else {
						finalLeftChildren.push(item)
					}
				}
			}

			const oldAfterMatchChildren = diffOldChildren.slice(oldEndIndex)
			const newAfterMatchChildren = diffNewChildren.slice(newEndIndex)

			finalRightChildren.unshift(
				...patchRemainNodes(
					schema,
					oldAfterMatchChildren,
					newAfterMatchChildren,
				),
			)
		} else {
			finalLeftChildren.push(
				...patchRemainNodes(schema, diffOldChildren, diffNewChildren),
			)
		}
	} else {
		finalLeftChildren.push(
			...patchRemainNodes(schema, diffOldChildren, diffNewChildren),
		)
	}

	return createNewNode(oldNode, [...finalLeftChildren, ...finalRightChildren])
}

interface MatchResult {
	oldStartIndex: number
	newStartIndex: number
	oldEndIndex: number
	newEndIndex: number
	count: number
}

function matchNodes(
	_schema: Schema,
	oldChildren: NormalizedContent,
	newChildren: NormalizedContent,
): MatchResult[] {
	const matches: MatchResult[] = []
	for (
		let oldStartIndex = 0;
		oldStartIndex < oldChildren.length;
		oldStartIndex++
	) {
		const oldStartNode = oldChildren[oldStartIndex]!
		const newStartIndex = findMatchNode(newChildren, oldStartNode)

		if (newStartIndex !== -1) {
			let oldEndIndex = oldStartIndex + 1
			let newEndIndex = newStartIndex + 1
			for (
				;
				oldEndIndex < oldChildren.length &&
				newEndIndex < newChildren.length;
				oldEndIndex++, newEndIndex++
			) {
				const oldEndNode = oldChildren[oldEndIndex]!
				const newEndNode = newChildren[newEndIndex]!
				if (!isNodeEqual(newEndNode, oldEndNode)) {
					break
				}
			}
			matches.push({
				oldStartIndex,
				newStartIndex,
				oldEndIndex,
				newEndIndex,
				count: newEndIndex - newStartIndex,
			})
		}
	}
	return matches
}

function findMatchNode(
	children: NormalizedContent,
	node: PMNode | PMNode[],
	startIndex = 0,
): number {
	for (let i = startIndex; i < children.length; i++) {
		if (isNodeEqual(children[i]!, node)) {
			return i
		}
	}
	return -1
}

function patchRemainNodes(
	schema: Schema,
	oldChildren: NormalizedContent,
	newChildren: NormalizedContent,
): PMNode[] {
	const finalLeftChildren: PMNode[] = []
	const finalRightChildren: PMNode[] = []
	const oldChildLen = oldChildren.length
	const newChildLen = newChildren.length
	let left = 0
	let right = 0
	while (oldChildLen - left - right > 0 && newChildLen - left - right > 0) {
		const leftOldNode = oldChildren[left]!
		const leftNewNode = newChildren[left]!
		const rightOldNode = oldChildren[oldChildLen - right - 1]!
		const rightNewNode = newChildren[newChildLen - right - 1]!
		let updateLeft =
			!isTextNode(leftOldNode) && matchNodeType(leftOldNode, leftNewNode)
		let updateRight =
			!isTextNode(rightOldNode) &&
			matchNodeType(rightOldNode, rightNewNode)
		if (Array.isArray(leftOldNode) && Array.isArray(leftNewNode)) {
			finalLeftChildren.push(
				...patchTextNodes(schema, leftOldNode, leftNewNode),
			)
			left += 1
			continue
		}

		if (updateLeft && updateRight) {
			const equalityLeft = computeChildEqualityFactor(
				leftOldNode,
				leftNewNode,
			)
			const equalityRight = computeChildEqualityFactor(
				rightOldNode,
				rightNewNode,
			)
			if (equalityLeft < equalityRight) {
				updateLeft = false
			} else {
				updateRight = false
			}
		}
		if (updateLeft) {
			finalLeftChildren.push(
				patchDocumentNode(
					schema,
					leftOldNode as PMNode,
					leftNewNode as PMNode,
				),
			)
			left += 1
		} else if (updateRight) {
			finalRightChildren.unshift(
				patchDocumentNode(
					schema,
					rightOldNode as PMNode,
					rightNewNode as PMNode,
				),
			)
			right += 1
		} else {
			// Delete and insert
			finalLeftChildren.push(
				createDiffNode(schema, leftOldNode as PMNode, DiffType.Deleted),
			)
			finalLeftChildren.push(
				createDiffNode(
					schema,
					leftNewNode as PMNode,
					DiffType.Inserted,
				),
			)
			left += 1
		}
	}

	const deleteNodeLen = oldChildLen - left - right
	const insertNodeLen = newChildLen - left - right
	if (deleteNodeLen) {
		finalLeftChildren.push(
			...oldChildren
				.slice(left, left + deleteNodeLen)
				.flat()
				.map((node) => createDiffNode(schema, node, DiffType.Deleted)),
		)
	}

	if (insertNodeLen) {
		finalRightChildren.unshift(
			...newChildren
				.slice(left, left + insertNodeLen)
				.flat()
				.map((node) => createDiffNode(schema, node, DiffType.Inserted)),
		)
	}

	return [...finalLeftChildren, ...finalRightChildren]
}

/**
 * Word-aware diff function using line-mode diff for better accuracy
 */
export function patchTextNodes(
	schema: Schema,
	oldNode: PMNode[],
	newNode: PMNode[],
): PMNode[] {
	const dmp = new diff_match_patch()

	// Concatenate the text from the text nodes
	const oldText = oldNode.map((n) => getNodeText(n)).join("")
	const newText = newNode.map((n) => getNodeText(n)).join("")

	// Use word-mode diff for better semantic results
	const { text1, text2, lineArray } = wordsToChars(oldText, newText)

	// Perform diff on word-level representation
	let diffs = dmp.diff_main(text1, text2, false)

	// Convert back from word representation to actual text
	diffs = charsToWords(diffs, lineArray)

	// Apply semantic cleanup and efficiency cleanup for better human-readable results
	dmp.diff_cleanupSemantic(diffs)
	dmp.diff_cleanupEfficiency(diffs)

	// Map diffs to nodes
	const res = diffs.flatMap(([diffType, text]) => {
		if (!text) {
			return []
		}

		const node = createTextNode(
			schema,
			text,
			diffType !== DiffType.Unchanged
				? [createDiffMark(schema, diffType as DiffTypeValue)]
				: [],
		)
		return node
	})

	return res
}

interface WordsToCharsResult {
	text1: string
	text2: string
	lineArray: string[]
}

/**
 * Function to tokenize text into words and convert to character representation
 */
function wordsToChars(text1: string, text2: string): WordsToCharsResult {
	const lineArray: string[] = [] // Actually stores words
	const lineHash: Record<string, number> = {}
	const maxLines = 40_000 // Maximum number of unique words

	/**
	 * Split text into an array of words with their surrounding whitespace
	 * This preserves the exact spacing while allowing word-level comparison
	 */
	const linesToCharsMunge = (text: string) => {
		let chars = ""
		let lineArrayLength = lineArray.length

		// Split text into words, preserving whitespace
		const words = text.match(/\S+|\s+/g) || []

		for (const word of words) {
			const existingIndex = lineHash[word]
			if (existingIndex !== undefined) {
				chars += String.fromCharCode(existingIndex)
			} else {
				if (lineArrayLength === maxLines) {
					// Bail out at maxLines because Unicode can't handle any more.
					// Use remaining text as a single word
					break
				}
				lineHash[word] = lineArrayLength
				lineArray[lineArrayLength++] = word
				chars += String.fromCharCode(lineArrayLength - 1)
			}
		}

		return chars
	}

	const chars1 = linesToCharsMunge(text1)
	const chars2 = linesToCharsMunge(text2)

	return { text1: chars1, text2: chars2, lineArray }
}

/**
 * Convert character representation back to actual words
 */
function charsToWords(
	diffs: [number, string][],
	lineArray: string[],
): [number, string][] {
	return diffs.map(([type, text]) => {
		const words: string[] = []
		for (let i = 0; i < text.length; i++) {
			const word = lineArray[text.charCodeAt(i)]
			if (word !== undefined) {
				words.push(word)
			}
		}
		return [type, words.join("")]
	})
}

export function computeChildEqualityFactor(
	_node1: PMNode | PMNode[],
	_node2: PMNode | PMNode[],
): number {
	return 0
}

export function assertNodeTypeEqual(node1: PMNode, node2: PMNode): void {
	if (getNodeProperty(node1, "type") !== getNodeProperty(node2, "type")) {
		throw new Error(`node type not equal: ${node1.type} !== ${node2.type}`)
	}
}

export function ensureArray<T>(value: T | T[]): T[] {
	return Array.isArray(value) ? value : [value]
}

export function isNodeEqual(
	node1: PMNode | PMNode[],
	node2: PMNode | PMNode[],
): boolean {
	const isNode1Array = Array.isArray(node1)
	const isNode2Array = Array.isArray(node2)
	if (isNode1Array !== isNode2Array) {
		return false
	}
	if (isNode1Array && isNode2Array) {
		return (
			node1.length === node2.length &&
			node1.every((node, index) => isNodeEqual(node, node2[index]!))
		)
	}

	const n1 = node1 as PMNode
	const n2 = node2 as PMNode

	const type1 = getNodeProperty(n1, "type")
	const type2 = getNodeProperty(n2, "type")
	if (type1 !== type2) {
		return false
	}
	if (isTextNode(n1)) {
		const text1 = getNodeProperty(n1, "text")
		const text2 = getNodeProperty(n2, "text")
		if (text1 !== text2) {
			return false
		}
	}
	const attrs1 = getNodeAttributes(n1)
	const attrs2 = getNodeAttributes(n2)
	const attrs = [...new Set([...Object.keys(attrs1), ...Object.keys(attrs2)])]
	for (const attr of attrs) {
		if (attrs1[attr] !== attrs2[attr]) {
			return false
		}
	}
	const marks1 = getNodeMarks(n1)
	const marks2 = getNodeMarks(n2)
	if (marks1.length !== marks2.length) {
		return false
	}
	for (let i = 0; i < marks1.length; i++) {
		const mark1 = marks1[i]
		const mark2 = marks2[i]
		if (mark1 && mark2 && !isMarkEqual(mark1, mark2)) {
			return false
		}
	}
	const children1 = getNodeChildren(n1)
	const children2 = getNodeChildren(n2)
	if (children1.length !== children2.length) {
		return false
	}
	for (let i = 0; i < children1.length; i++) {
		const child1 = children1[i]
		const child2 = children2[i]
		if (child1 && child2 && !isNodeEqual(child1, child2)) {
			return false
		}
	}
	return true
}

function isMarkEqual(mark1: unknown, mark2: unknown): boolean {
	if (typeof mark1 !== "object" || typeof mark2 !== "object") {
		return mark1 === mark2
	}
	if (!mark1 || !mark2) {
		return mark1 === mark2
	}
	const m1 = mark1 as { type?: { name?: string } }
	const m2 = mark2 as { type?: { name?: string } }
	return m1.type?.name === m2.type?.name
}

export function normalizeNodeContent(node: PMNode): NormalizedContent {
	const content = getNodeChildren(node) ?? []
	const res: NormalizedContent = []
	for (let i = 0; i < content.length; i++) {
		const child = content[i]
		if (child && isTextNode(child)) {
			const textNodes: PMNode[] = []
			for (
				let textNode = content[i];
				i < content.length && textNode && isTextNode(textNode);
				textNode = content[++i]
			) {
				textNodes.push(textNode)
			}
			i--
			res.push(textNodes)
		} else if (child) {
			res.push(child)
		}
	}
	return res
}

export function getNodeProperty(node: PMNode, property: string): unknown {
	if (property === "type") {
		return (node.type as { name?: string })?.name
	}
	return node[property as keyof PMNode]
}

export function getNodeAttribute(
	node: PMNode,
	attribute: string,
): unknown | undefined {
	return node.attrs ? node.attrs[attribute] : undefined
}

export function getNodeAttributes(node: PMNode): Record<string, unknown> {
	return node.attrs ? { ...node.attrs } : {}
}

export function getNodeMarks(node: PMNode): unknown[] {
	return (node.marks ?? []) as unknown[]
}

export function getNodeChildren(node: PMNode): PMNode[] {
	// Access content array from Fragment
	const children: PMNode[] = []
	node.content.forEach((child) => {
		children.push(child)
	})
	return children
}

export function getNodeText(node: PMNode): string {
	return (node as unknown as { text?: string }).text ?? ""
}

export function isTextNode(node: PMNode | PMNode[]): boolean {
	if (Array.isArray(node)) return false
	return (node.type as { name?: string })?.name === "text"
}

export function matchNodeType(
	node1: PMNode | PMNode[],
	node2: PMNode | PMNode[],
): boolean {
	if (Array.isArray(node1) && Array.isArray(node2)) return true
	if (Array.isArray(node1) || Array.isArray(node2)) return false
	return (node1 as PMNode).type?.name === (node2 as PMNode).type?.name
}

export function createNewNode(oldNode: PMNode, children: PMNode[]): PMNode {
	if (!oldNode.type) {
		throw new Error("oldNode.type is undefined")
	}
	// Use Node.createFromJSON to create a new node with updated content
	const json = oldNode.toJSON() as Record<string, unknown>
	json.content = children.map((c) => c.toJSON())
	return Node.fromJSON(oldNode.type.schema, json)
}

export function createDiffNode(
	schema: Schema,
	node: PMNode,
	type: DiffTypeValue,
): PMNode {
	return mapDocumentNode(node, (currentNode) => {
		if (isTextNode(currentNode)) {
			return createTextNode(schema, getNodeText(currentNode), [
				...((currentNode.marks as unknown[]) || []),
				createDiffMark(schema, type),
			])
		}
		return currentNode
	})
}

function mapDocumentNode(
	node: PMNode,
	mapper: (node: PMNode) => PMNode | null | undefined,
): PMNode {
	const children: PMNode[] = []
	node.content.forEach((child) => {
		const mapped = mapDocumentNode(child, mapper)
		if (mapped) children.push(mapped)
	})
	const copy = node.copy(Fragment.from(children))
	return mapper(copy) || copy
}

export function createDiffMark(schema: Schema, type: DiffTypeValue): unknown {
	if (type === DiffType.Inserted) {
		return schema.mark("diffMark", { type })
	}
	if (type === DiffType.Deleted) {
		return schema.mark("diffMark", { type })
	}
	throw new Error("type is not valid")
}

export function createTextNode(
	schema: Schema,
	content: string,
	marks: unknown[] = [],
): PMNode {
	return schema.text(content, marks as Parameters<typeof schema.text>[1])
}

/**
 * Main diff function for editor documents
 * Takes schema and two document JSON representations, returns diffed document
 */
export function diffEditor(
	schema: Schema,
	oldDoc: Record<string, unknown>,
	newDoc: Record<string, unknown>,
): PMNode {
	const oldNode = Node.fromJSON(schema, oldDoc)
	const newNode = Node.fromJSON(schema, newDoc)
	return patchDocumentNode(schema, oldNode, newNode)
}
