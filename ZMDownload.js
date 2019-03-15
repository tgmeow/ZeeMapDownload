/**
 * Class for managing Zeemaps downloads. Provides function getPage which
 * downloads and writes to csv using a single instance of csv-writer
 * @type {module.ZMDownload}
 */
module.exports = class ZMDownload {
  constructor(filename) {
    this.rp = require("request-promise");
    this.cheerio = require("cheerio");
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

  /**
   * Download markers and page and writes into CSV
   * @param group
   * @returns {Promise<void>}
   */
  getPage(group) {
    const PAGE_URL = "https://www.zeemaps.com/map/settings?group=" + group;
    const MARKER_URL = "https://www.zeemaps.com/emarkers?g=" + group;

    let page = this.rp(PAGE_URL);
    let markers = this.rp(MARKER_URL);

    return Promise.all([page, markers])
      .then(values => {
        const $ = this.cheerio.load(values[0]);
        let all_markers = JSON.parse(values[1]);
        const data = {
          group: group,
          map_title: $("input[name='name']").attr("value"),
          email: $("input[name='email']").attr("value"),
          description: $("textarea[name='description']").html(),
          m_name: all_markers.map(item => item["ov"]),
          m_address: all_markers.map(item => item["a"]),
          m_country: all_markers.map(item => item["cty"]),
          m_coords: all_markers.map(item => [item["lng"], item["lat"]])
        };
        if (
          data.map_title !== "" ||
          data.email !== "" ||
          data.description !== "" ||
          all_markers.length !== 0
        ) {
          return this.csvWriter.writeRecords([data]);
        }
      })
      .catch(err => {
        if ("statusCode" in err && err.statusCode === 403) {
          // Map is private.
          // Unable to view markers although can view title and email
        } else {
          console.log("ERR: Failed to save group " + group + ". Error: " + err);
        }
      });
  }
};
