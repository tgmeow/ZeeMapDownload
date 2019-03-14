const rp = require("request-promise");
const cheerio = require("cheerio");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const csvWriter = createCsvWriter({
  path: "output.csv",
  header: [
    { id: "map_title", title: "MAP_TITLE" },
    { id: "email", title: "EMAIL" },
    { id: "description", title: "DESCRIPTION" },
    { id: "m_name", title: "M_NAME" },
    { id: "m_address", title: "M_ADDRESS" },
    { id: "m_country", title: "M_COUNTRY" },
    { id: "m_coords", title: "M_COORDINATES" }
  ]
});

/**
 * Download markers and page and writes into CSV
 * @param group
 * @returns {Promise<void>}
 */
async function getPage(group) {
  const PAGE_URL = "https://www.zeemaps.com/map/settings?group=" + group;
  const MARKER_URL = "https://www.zeemaps.com/emarkers?g=" + group;

  let page = rp(PAGE_URL);
  let markers = rp(MARKER_URL);

  return Promise.all([page, markers])
    .then(values => {
      const $ = cheerio.load(values[0]);
      let all_markers = JSON.parse(values[1]);
      return [
        {
          map_title: $("input[name='name']").attr("value"),
          email: $("input[name='email']").attr("value"),
          description: $("textarea[name='description']").html(),
          m_name: all_markers.map(item => item["ov"]),
          m_address: all_markers.map(item => item["a"]),
          m_country: all_markers.map(item => item["cty"]),
          m_coords: all_markers.map(item => [item["lng"], item["lat"]])
        }
      ];
    })
    .then(data => {
      csvWriter.writeRecords(data);
    })
    .catch(err => {
      console.log("Failed to save group " + group + ". Error: " + err);
    });
}

getPage(1020541);
