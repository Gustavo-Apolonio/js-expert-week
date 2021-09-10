import { describe, test, expect, jest, beforeAll, beforeEach, afterAll } from "@jest/globals";
import FormData from "form-data";
import fs from "fs";
import { logger } from "../../src/logger.js";
import TestUtil from "../_utils/testUtil.js";
import { tmpdir } from "os";
import Routes from "./../../src/routes.js";
import { join } from "path";

describe("#Routes integration test suite", () => {
    let defaultDownloadsFolder = ''
    
    beforeAll(async () => {
        defaultDownloadsFolder = await fs.promises.mkdtemp(join(tmpdir(), 'downloads-'))
    })

    afterAll(async () => {
        await fs.promises.rm(defaultDownloadsFolder, { recursive: true })
    });

    beforeEach(() => {
      jest.spyOn(logger, "info").mockImplementation();
    });
    
  describe("#getFileStatus", () => {
    const ioObj = {
      to: (id) => ioObj,
      emit: (event, message) => {},
    };

    test("Should upload file to the folder", async () => {
      const filename = "temp0.txt";
      const fileStream = fs.createReadStream(
        `./test/integration/mocks/${filename}`
      );
      const response = TestUtil.generateWritableStream(() => {});

      const form = new FormData();
      form.append("text", fileStream);

      const defaultParams = {
        request: Object.assign(form, {
          headers: form.getHeaders(),
          method: "POST",
          url: "?socketId=10",
        }),
        response: Object.assign(response, {
          setHeader: jest.fn(),
          writeHead: jest.fn(),
          end: jest.fn(),
        }),
        values: () => Object.values(defaultParams),
      };

      const route = new Routes(defaultDownloadsFolder);

        route.setSocketInstance(ioObj);
        const dirBefore = await fs.promises.readdir(defaultDownloadsFolder)
        expect(dirBefore).toEqual([])
        await route.handler(...defaultParams.values());
        const dirAfter = await fs.promises.readdir(defaultDownloadsFolder);
        expect(dirAfter).toEqual([filename])

        expect(defaultParams.response.writeHead).toHaveBeenCalledWith(200)
        const exepectedEndResult = JSON.stringify({ result: 'Files uploaded with success!' })
        expect(defaultParams.response.end).toHaveBeenCalledWith(exepectedEndResult);
        
    });
  });
});
