"use strict";

/**
 * Run a Promise that times out in ms milliseconds
 * Big thanks to https://italonascimento.github.io/applying-a-timeout-to-your-promises/
 * @param ms
 * @param id
 * @param promise
 */
export function promiseTimeout(
  ms: number,
  id: number,
  promise: Promise<any>
): Promise<any> {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise((resolve, reject) => {
    const timing = setTimeout(() => {
      clearTimeout(timing);
      reject(`Task: ${id} Timed out in ${ms} ms.`);
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
}

/**
 * Wait for ms milliseconds and return a resolved promise
 * @param ms
 */
export function promiseWait(ms: number): Promise<void> {
  // if (VERBOSE_LOG) ZM.log("info", "WAITING FOR TIMEOUT");
  return new Promise(resolve => setTimeout(resolve, ms));
}
