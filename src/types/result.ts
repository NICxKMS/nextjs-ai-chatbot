/**
 * Result Type Pattern
 * @module @/src/types/result
 *
 * Provides explicit error handling without exceptions.
 * Use this for all fallible operations.
 */

/**
 * Represents a successful result containing a value
 */
export interface Ok<T> {
	readonly ok: true;
	readonly value: T;
}

/**
 * Represents a failed result containing an error
 */
export interface Err<E> {
	readonly ok: false;
	readonly error: E;
}

/**
 * A discriminated union representing either success (Ok) or failure (Err)
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Creates a successful Result
 */
export function ok<T>(value: T): Ok<T> {
	return { ok: true, value };
}

/**
 * Creates a failed Result
 */
export function err<E>(error: E): Err<E> {
	return { ok: false, error };
}

/**
 * Type guard to check if a Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
	return result.ok === true;
}

/**
 * Type guard to check if a Result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
	return result.ok === false;
}

/**
 * Extracts the value from a Result, throwing if it's an error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
	if (isOk(result)) {
		return result.value;
	}
	throw result.error;
}

/**
 * Extracts the value from a Result, returning a default if it's an error
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	return isOk(result) ? result.value : defaultValue;
}

/**
 * Maps a Result's Ok value using a transformation function
 */
export function map<T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => U,
): Result<U, E> {
	if (isOk(result)) {
		return ok(fn(result.value));
	}
	return result;
}

/**
 * Maps a Result's Err value using a transformation function
 */
export function mapErr<T, E, F>(
	result: Result<T, E>,
	fn: (error: E) => F,
): Result<T, F> {
	if (isErr(result)) {
		return err(fn(result.error));
	}
	return result;
}

/**
 * Chains Result operations (flatMap)
 */
export function flatMap<T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => Result<U, E>,
): Result<U, E> {
	if (isOk(result)) {
		return fn(result.value);
	}
	return result;
}

/**
 * Wraps a promise that might reject into a Result
 */
export async function fromPromise<T, E = Error>(
	promise: Promise<T>,
): Promise<Result<T, E>> {
	try {
		const value = await promise;
		return ok(value);
	} catch (error) {
		return err(error as E);
	}
}

/**
 * Wraps a function that might throw into a Result
 */
export function fromThrowable<T, E = Error>(fn: () => T): Result<T, E> {
	try {
		return ok(fn());
	} catch (error) {
		return err(error as E);
	}
}

/**
 * Combines multiple Results into a single Result containing an array
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
	const values: T[] = [];
	for (const result of results) {
		if (isErr(result)) {
			return result;
		}
		values.push(result.value);
	}
	return ok(values);
}
