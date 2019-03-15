"use strict";

const ZMDownload = require("./ZMDownload.js");

let ZM = new ZMDownload("output.csv");

let curr_group = 1;
const MAX_GROUP = 3355100;
// const MAX_GROUP = 5000;
const CONCUR = 300;
const PRINT_MODULO = 3000;

/**
 * Run the main task, ZM.getPage(), which then returns a promise.
 * @returns {Promise<undefined>} Rejected promise if curr_group >= MAX_GROUP or
 * negative. Otherwise returns the result of ZM.getPage() (Resolved undefined)
 */
function task() {
  if (curr_group >= MAX_GROUP || curr_group < 0) {
    return Promise.reject(curr_group);
  }
  if (curr_group % PRINT_MODULO === 0) {
    ZM.log("info", "group: " + curr_group);
  }
  return ZM.getPage(curr_group++);
}

/**
 * 'Recursively' runs task() using Promises which go into microtasks event queue
 * @returns {Promise<undefined>} Resolved
 */
function start() {
  return task()
    .then(() => start())
    .catch(err => {
      if (err !== MAX_GROUP) {
        ZM.log("error", "ERR: " + err);
      }
    });
}

ZM.log("info", "starting...");
// Create an array of Promises. Similar to multi-threading PIDs
let syncs = [];
for (let i = 0; i < CONCUR; ++i) {
  syncs.push(start()); // push is very fast, negligible diff with pre-allocating
}

// Wait for all promises to resolve or 'join'
Promise.all(syncs)
  .then(() => {
    ZM.log("info", "done!");
  })
  .catch(err => {
    ZM.log("error", "ERR PROMISE ALL: " + err);
  });
