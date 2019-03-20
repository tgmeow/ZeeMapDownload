"use strict";

import { RequestPromise } from "request-promise";

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
  promise: Promise<any> | RequestPromise
): Promise<any> {
  // Create a promise that rejects in <ms> milliseconds
  let timing: NodeJS.Timer;
  const timeout = new Promise((resolve, reject) => {
    timing = setTimeout(() => {
      reject(`Task: ${id} Timed out in ${ms} ms.`);
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]).then(result => {
    clearTimeout(timing);
    return result;
  });
}

/**
 * Wait for ms milliseconds and return a resolved promise
 * @param ms
 */
export function promiseWait(ms: number): Promise<void> {
  // if (VERBOSE_LOG) ZM.log("info", "WAITING FOR TIMEOUT");
  return new Promise(resolve => setTimeout(resolve, ms));
}
