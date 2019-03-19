/**
 * Runs CONCUR "threads" in parallel. Each thread works on the global count
 * until reaching MAX.
 */
let count = 0;
const MAX = 200;
let startTime = Date.now();

let task1 = () => {
  return new Promise((resolve, reject) => {
    let time = Math.random() * 1000;
    setTimeout(() => {
      if (count >= MAX) {
        return reject(count);
      }
      console.log(count++ + " " + (Date.now() - startTime));
      // console.log(count++ + " " + time);
      return resolve(count);
    }, time);
  });
};

const CONCUR = 50;
console.log("start!");

function start(next) {
  return task1()
    .then(() => next(next))
    .catch(err => {
      if (err !== MAX) {
        console.log("ERR: " + err);
      }
    });
}

let syncs = [];
for (let i = 0; i < CONCUR; ++i) {
  syncs.push(start(start));
}

Promise.all(syncs).then(() => {
  console.log("done!");
});
