"use strict";

const ZMDownload = require("./ZMDownload.js");

let ZM = new ZMDownload("testbench.csv");

ZM.getPage(441).then(() => {
  ZM.log("info", "done!");
});
