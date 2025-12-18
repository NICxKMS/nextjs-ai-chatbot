/**
 * Returns a promise that resolves after the specified duration.
 *
 * @param ms - The duration to wait in milliseconds
 * @returns A promise that resolves after the delay
 *
 * @example
 * await sleep(1000); // Wait 1 second
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls a condition function until it returns true or times out.
 *
 * @param condition - A function that returns true when the condition is met
 * @param options - Configuration options
 * @param options.timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param options.interval - Time between checks in milliseconds (default: 100)
 * @returns A promise that resolves when the condition is met
 * @throws Error if the timeout is reached before the condition is met
 *
 * @example
 * await waitFor(() => document.querySelector('#element') !== null);
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const result = await condition();
        if (result) {
            return;
        }
        await sleep(interval);
    }

    throw new Error(`waitFor timed out after ${timeout}ms`);
}
