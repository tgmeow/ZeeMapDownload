"use strict";
import cheerio from "cheerio";
import { createObjectCsvWriter } from "csv-writer"; // createObjectCsvWriter;
import fs from "fs";
import rp from "request-promise";
import * as winston from "winston";
import { promiseTimeout } from "./timeout-promise";

/**
 * Interface for the formatted data
 */
interface IDataFormatted {
  description: string;
  email: string;
  group: number;
  m_address: string[];
  m_country: string[];
  m_lat: number[];
  m_long: number[];
  m_name: string[];
  map_title: string;
}

/**
 * Class for managing Zeemaps downloads. Provides function getPage which
 * downloads and writes to csv using a single instance of csv-writer
 */
export default class ZMDownload {
  /**
   * Check if the object contains string field and replaces newline chars
   * @param item
   * @param field
   * @param replacement
   */
  private static isStrPar(
    item: any,
    field: string,
    replacement: string
  ): string {
    return item && field in item && typeof item[field] === "string"
      ? item[field].replace(/[\n\r]/g, replacement)
      : "";
  }

  /**
   * Reformat the data into the csv compatible object
   * @param group
   * @param $
   * @param markers
   */
  private static formatData(
    group: number,
    $: CheerioStatic,
    markers: Array<{
      a?: string;
      cty?: string;
      ov?: string;
      lng?: number;
      lat?: number;
    }>
  ): IDataFormatted {
    const descp = $("textarea[name='description']").html();
    return {
      description: descp ? descp.replace(/[\n\r]/g, "; ") : "",
      email: $("input[name='email']")
        .attr("value")
        .replace(/[\n\r]/g, " "),
      group,
      m_address: markers.map(item => this.isStrPar(item, "a", " ")),
      m_country: markers.map(item => this.isStrPar(item, "cty", "")),
      m_lat: markers.map(item =>
        item && "lat" in item && typeof item.lat === "number" ? item.lat : 0
      ),
      m_long: markers.map(item =>
        item && "lng" in item && typeof item.lng === "number" ? item.lng : 0
      ),
      m_name: markers.map(item => this.isStrPar(item, "ov", "")),
      map_title: $("input[name='name']")
        .attr("value")
        .replace(/[\n\r]/g, " ")
    };
  }
  private logger: winston.Logger;
  private verbose: boolean;
  private csvWriter: any;

  /**
   * Create a ZMDownload object
   * @param filename name of output csv
   * @param verbose TODO enable verbose logging
   */
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
        { id: "m_long", title: "M_LONG" },
        { id: "m_lat", title: "M_LAT" }
      ],
      path: filename
    });

    if (!fs.existsSync(filename)) {
      const headerString =
        "GROUP,MAP_TITLE,EMAIL,DESCRIPTION,M_NAME,M_ADDRESS,M_COUNTRY,M_LONG,M_LAT\n";
      fs.writeFileSync(filename, headerString);
    }
  }

  /**
   * Provides a way to access the logger of this instance
   * @param level
   * @param message
   */
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

    const TIMEOUT1 = 10 * 1000;
    const pagePromise = promiseTimeout(TIMEOUT1, group, rp(PAGE_URL));
    const markersProm = promiseTimeout(TIMEOUT1, group, rp(MARKER_URL));

    return Promise.all([pagePromise, markersProm])
      .then(async values => {
        const $ = cheerio.load(values[0]);
        const markers = JSON.parse(values[1]);

        const data = ZMDownload.formatData(group, $, markers);

        //   data.map_title !== "" ||
        //   data.email !== "" ||
        //   data.description !== "" ||
        //   markers.length !== 0
        // may write empty lines but that tells us its not private
        const TIMEOUT2 = 9 * 1000;
        await promiseTimeout(
          TIMEOUT2,
          group,
          this.csvWriter.writeRecords([data])
        );

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
