"use strict";

import { promiseTimeout, promiseWait } from "./timeout-promise";
import ZMDownload from "./ZMDownload";

const VERBOSE_LOG = true; // TODO

const ZM = new ZMDownload("output.csv", VERBOSE_LOG);

let currGroup = 1;
const MAX_GROUP = 3355100;
// const MAX_GROUP = 10;
const CONCUR = 1;
const DELAY = 1500;
const TASK_TIMEOUT = 30 * 1000; // If task does not complete within 30 sec, skip
const PRINT_MODULO = 1000;

/**
 * Run the main task, ZM.getPage(), which then returns a promise.
 * @returns {Promise<undefined>} Rejected promise if currGroup >= MAX_GROUP or
 * negative. Otherwise returns the result of ZM.getPage() (Resolved undefined)
 */
async function task(id: number): Promise<number> {
  ++counts[id];
  if (currGroup >= MAX_GROUP || currGroup < 0) {
    // if (VERBOSE_LOG) ZM.log("info", "REJECTING BECAUSE DONE");
    return Promise.reject(currGroup);
  }
  if (currGroup % PRINT_MODULO === 0) {
    ZM.log("info", `time: ${Date.now() - startTime}`);
    ZM.log("info", `group: ${currGroup}`);
  }
  if (counts[id] % PRINT_MODULO === 0) {
    ZM.log("info", `time: ${Date.now() - startTime}`);
    ZM.log("info", `id: ${id} count: ${counts[id]}`);
  }
  // if (VERBOSE_LOG) ZM.log("info", "AWAITING ZM.GETPAGE FOR: " + currGroup);
  return promiseTimeout(TASK_TIMEOUT, currGroup, ZM.getPage(currGroup++));
}

/**
 * 'Recursively' runs task() using Promises which go into microtasks event queue
 * @returns {Promise<undefined>} Resolved
 */
async function start(id: number): Promise<void> {
  return task(id)
    .then(async () => {
      // return wait(DELAY).then( () => start()); // ?
      await promiseWait(DELAY);
      return start(id);
    })
    .catch(err => {
      if (err !== MAX_GROUP) {
        ZM.log("error", `ERR: ${err}`);
      }
      return Promise.resolve();
    });
}

/**
 * Iterative version to run task until it returns a Promise Reject with MAX_GROUP
 * @param id like thread pid
 */
async function startAwait(id: number): Promise<void> {
  let cont = true;
  while (cont) {
    try {
      await promiseWait(DELAY);
      await task(id);
    } catch (err) {
      if (err === MAX_GROUP) {
        cont = false;
      } else {
        ZM.log("error", `ERR: ${err}`);
      }
    }
  }
  return Promise.resolve();
}

console.info("starting...");
ZM.log("info", "starting...");
const startTime = Date.now();
// Create an array of Promises. Similar to multi-threading PIDs
const syncs = [];
const counts = Array(CONCUR).fill(0);
for (let i = 0; i < CONCUR; ++i) {
  syncs.push(startAwait(i)); // push is very fast, negligible diff with pre-allocating
}

// Wait for all promises to resolve or 'join'
Promise.all(syncs)
  .then(() => {
    console.info("done!");
    ZM.log("info", "done!");
  })
  .catch(err => {
    ZM.log("error", `ERR PROMISE ALL: ${err}`);
  });
