"use strict";

const ZMDownload = require("./ZMDownload.js");

let ZM = new ZMDownload("output.csv");

let curr_group = 1;
const MAX_GROUP = 3355100;
// const MAX_GROUP = 5000;
const CONCUR = 2;
const DELAY = 500;
const PRINT_MODULO = 100;

/**
 * Run the main task, ZM.getPage(), which then returns a promise.
 * @returns {Promise<undefined>} Rejected promise if curr_group >= MAX_GROUP or
 * negative. Otherwise returns the result of ZM.getPage() (Resolved undefined)
 */
async function task(id) {
  if (curr_group >= MAX_GROUP || curr_group < 0) {
    return Promise.reject(curr_group);
  }
  if (curr_group % PRINT_MODULO === 0) {
    ZM.log("info", "group: " + curr_group);
    ZM.log("info", id + " time: " + (Date.now() - startTime));
  }
  return ZM.getPage(curr_group++);
}

/**
 * Wait for specified number of ms, returns a resolved promise.
 * @param ms
 * @returns {Promise<any>}
 */
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 'Recursively' runs task() using Promises which go into microtasks event queue
 * @returns {Promise<undefined>} Resolved
 */
async function start(id) {
  return task(id)
    .then(async () => {
      // return wait(DELAY).then( () => start()); // ?
      await wait(DELAY);
      return start(id);
    })
    .catch(err => {
      if (err !== MAX_GROUP) {
        ZM.log("error", "ERR: " + err);
      }
    });
}

ZM.log("info", "starting...");
let startTime = Date.now();
// Create an array of Promises. Similar to multi-threading PIDs
let syncs = [];
for (let i = 0; i < CONCUR; ++i) {
  syncs.push(start(i)); // push is very fast, negligible diff with pre-allocating
}

// Wait for all promises to resolve or 'join'
Promise.all(syncs)
  .then(() => {
    ZM.log("info", "done!");
  })
  .catch(err => {
    ZM.log("error", "ERR PROMISE ALL: " + err);
  });
