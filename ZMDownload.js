"use strict";
/**
 * Class for managing Zeemaps downloads. Provides function getPage which
 * downloads and writes to csv using a single instance of csv-writer
 * @type {module.ZMDownload}
 */
module.exports = class ZMDownload {
  constructor(filename) {
    this.rp = require("request-promise");
    this.cheerio = require("cheerio");
    this.winston = require("winston");
    this.logger = this.winston.createLogger({
      levels: this.winston.config.syslog.levels,
      transports: [
        new this.winston.transports.Console({ level: "error" }),
        new this.winston.transports.File({
          filename: "error.log",
          level: "info"
        })
      ]
    });

    this.createCsvWriter = require("csv-writer").createObjectCsvWriter;

    this.csvWriter = this.createCsvWriter({
      path: filename,
      append: true,
      header: [
        { id: "group", title: "GROUP" },
        { id: "map_title", title: "MAP_TITLE" },
        { id: "email", title: "EMAIL" },
        { id: "description", title: "DESCRIPTION" },
        { id: "m_name", title: "M_NAME" },
        { id: "m_address", title: "M_ADDRESS" },
        { id: "m_country", title: "M_COUNTRY" },
        { id: "m_coords", title: "M_COORDINATES" }
      ]
    });
  }

  log(level, message) {
    this.logger.log(level, message);
  }

  /**
   * Downloads the data for the ZeeMap of id group and saves to a csv file on
   * success. Does nothing if the map does not exist or is private.
   * @param group id of the map
   * @returns {Promise<undefined>} Resolved promise with undefined
   */
  getPage(group) {
    const PAGE_URL = "https://www.zeemaps.com/map/settings?group=" + group;
    const MARKER_URL = "https://www.zeemaps.com/emarkers?g=" + group;

    let page = this.rp(PAGE_URL);
    let markers = this.rp(MARKER_URL);

    return Promise.all([page, markers])
      .then(values => {
        const $ = this.cheerio.load(values[0]);
        let all_m = JSON.parse(values[1]);
        const data = {
          group: group,
          map_title: $("input[name='name']")
            .attr("value")
            .replace(/[\n\r]/g, " "),
          email: $("input[name='email']")
            .attr("value")
            .replace(/[\n\r]/g, " "),
          description: $("textarea[name='description']")
            .html()
            .replace(/[\n\r]/g, "; "),
          m_name: all_m.map(item =>
            "ov" in item ? item["ov"].replace(/[\n\r]/g, " ") : ""
          ),
          m_address: all_m.map(item =>
            "a" in item ? item["a"].replace(/[\n\r]/g, " ") : ""
          ),
          m_country: all_m.map(item =>
            "cty" in item ? item["cty"].replace(/[\n\r]/g, "") : ""
          ),
          m_coords: all_m.map(item => [item["lng"], item["lat"]])
        };

        if (
          data.map_title !== "" ||
          data.email !== "" ||
          data.description !== "" ||
          all_m.length !== 0
        ) {
          return this.csvWriter.writeRecords([data]);
        }
      })
      .catch(err => {
        if ("statusCode" in err && err.statusCode === 403) {
          // Map is private.
          // Unable to view markers although can view title and email
        } else {
          this.logger.log(
            "error",
            "ERR: Failed to save group " + group + ". Error: " + err
          );
        }
      });
  }
};
