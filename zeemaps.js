const ZMDownload = require("./ZMDownload.js");

let ZM = new ZMDownload("output.csv");

let curgroup = 1;
const MAX_GROUP = 3355100;
// const MAX_GROUP = 10;
const CONCUR = 200;

function task() {
  if (curgroup >= MAX_GROUP || curgroup < 0) {
    return Promise.reject(curgroup);
  }
  if (curgroup % 100 === 0) {
    console.log("group: " + curgroup);
  }
  return ZM.getPage(curgroup++);
}

function start(next) {
  return task()
    .then(() => {
      return next(next);
    })
    .catch(err => {
      if (err !== MAX_GROUP) {
        console.log("ERR: " + err);
      }
    });
}

let syncs = [];
for (let i = 0; i < CONCUR; ++i) {
  syncs.push(start(start));
}

Promise.all(syncs)
  .then(() => {
    console.log("done!");
  })
  .catch(err => {
    console.log("ERR PROMISE ALL: " + err);
  });
