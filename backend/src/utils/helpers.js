/**
 * Delay execution for a specified number of milliseconds.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Timeout wrapper for promises.
 * @param {Promise<any>} promise - Promise to execute
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise<any>}
 */
export const withTimeout = (promise, ms = 30000) => Promise.race([
  promise,
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  )
]);
