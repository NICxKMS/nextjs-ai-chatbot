/**
 * Capitalizes the first letter of a string.
 *
 * @param str - The string to capitalize
 * @returns String with first letter capitalized
 *
 * @example
 * capitalize('hello') // 'Hello'
 * capitalize('WORLD') // 'WORLD'
 */
export function capitalize(str: string): string {
    if (!str) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to a URL-friendly slug.
 *
 * @param str - The string to convert
 * @returns URL-safe slug
 *
 * @example
 * slugify('Hello World!') // 'hello-world'
 * slugify('  Multiple   Spaces  ') // 'multiple-spaces'
 */
export function slugify(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove non-word chars
        .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Returns the singular or plural form of a word based on count.
 *
 * @param count - The number to check
 * @param singular - The singular form of the word
 * @param plural - The plural form (defaults to singular + 's')
 * @returns The appropriate form with count
 *
 * @example
 * pluralize(1, 'item') // '1 item'
 * pluralize(5, 'item') // '5 items'
 * pluralize(2, 'person', 'people') // '2 people'
 */
export function pluralize(
    count: number,
    singular: string,
    plural?: string
): string {
    const form = count === 1 ? singular : (plural ?? `${singular}s`);
    return `${count} ${form}`;
}

/**
 * Converts a string to title case.
 *
 * @param str - The string to convert
 * @returns Title-cased string
 *
 * @example
 * titleCase('hello world') // 'Hello World'
 */
export function titleCase(str: string): string {
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => capitalize(word))
        .join(" ");
}

/**
 * Converts a string to camelCase.
 *
 * @param str - The string to convert
 * @returns camelCased string
 *
 * @example
 * camelCase('hello world') // 'helloWorld'
 * camelCase('foo-bar-baz') // 'fooBarBaz'
 */
export function camelCase(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}
