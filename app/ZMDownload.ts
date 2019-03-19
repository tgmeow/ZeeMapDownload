"use strict";
import cheerio from "cheerio";
import { createObjectCsvWriter } from "csv-writer"; // createObjectCsvWriter;
import fs from "fs";
import rp from "request-promise";
import * as winston from "winston";

/**
 * Class for managing Zeemaps downloads. Provides function getPage which
 * downloads and writes to csv using a single instance of csv-writer
 */
export default class ZMDownload {
  private logger: winston.Logger;
  private verbose: boolean;
  private csvWriter: any;

  constructor(filename: string, verbose: boolean) {
    this.logger = winston.createLogger({
      levels: winston.config.syslog.levels,
      transports: [
        new winston.transports.Console({ level: "error" }),
        new winston.transports.File({
          filename: "error.log",
          level: "info"
        })
      ]
    });

    this.verbose = verbose; // TODO

    this.csvWriter = createObjectCsvWriter({
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
      ],
      path: filename
    });

    if (!fs.existsSync(filename)) {
      const headerString =
        "GROUP,MAP_TITLE,EMAIL,DESCRIPTION,M_NAME,M_ADDRESS,M_COUNTRY,M_COORDINATES\n";
      fs.writeFileSync(filename, headerString);
    }
  }

  public log(level: string, message: string): void {
    this.logger.log(level, message);
  }

  /**
   * Downloads the data for the ZeeMap of id group and saves to a csv file on
   * success. Does nothing if the map does not exist or is private.
   * @param group id of the map
   * @returns {Promise<any>} Resolved promise with undefined
   */
  public async getPage(group: number): Promise<any> {
    const PAGE_URL = `https://www.zeemaps.com/map/settings?group=${group}`;
    const MARKER_URL = `https://www.zeemaps.com/emarkers?g=${group}`;

    const page = rp(PAGE_URL);
    const markers = rp(MARKER_URL);

    // pretty sure this await is not necessary?
    return Promise.all([page, markers])
      .then(async values => {
        const $ = cheerio.load(values[0]);
        const allM = JSON.parse(values[1]);
        const data = {
          description: $("textarea[name='description']").html(),
          email: $("input[name='email']")
            .attr("value")
            .replace(/[\n\r]/g, " "),
          group,
          m_address: allM.map(
            (item: {
              [x: string]: { replace: (arg0: RegExp, arg1: string) => void };
            }) => ("a" in item ? item.a.replace(/[\n\r]/g, " ") : "")
          ),
          m_coords: allM.map((item: { [x: string]: any }) => [
            item.lng,
            item.lat
          ]),
          m_country: allM.map(
            (item: {
              [x: string]: { replace: (arg0: RegExp, arg1: string) => void };
            }) => ("cty" in item ? item.cty.replace(/[\n\r]/g, "") : "")
          ),
          m_name: allM.map(
            (item: {
              [x: string]: { replace: (arg0: RegExp, arg1: string) => void };
            }) => ("ov" in item ? item.ov.replace(/[\n\r]/g, " ") : "")
          ),
          map_title: $("input[name='name']")
            .attr("value")
            .replace(/[\n\r]/g, " ")
        };
        if (data.description) {
          data.description = data.description.replace(/[\n\r]/g, "; ");
        }

        if (
          data.map_title !== "" ||
          data.email !== "" ||
          data.description !== "" ||
          allM.length !== 0
        ) {
          await this.csvWriter.writeRecords([data]);
        }
        return Promise.resolve(group); // should happen by default but idk bug somewhere
      })
      .catch(err => {
        if ("statusCode" in err && err.statusCode === 403) {
          // Map is private.
          // Unable to view markers although can view title and email
        } else {
          this.logger.log(
            "error",
            `ERR: Failed to save group ${group}. Error: ${err}`
          );
        }
        return Promise.resolve(group); // should happen by default but idk bug somewhere
      });
  }
}
