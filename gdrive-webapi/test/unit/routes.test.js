import { describe, test, expect, jest } from "@jest/globals";
import UploadHandler from "../../src/uploadHandler.js";
import TestUtil from "../_utils/testUtil.js";

import Routes from "./../../src/routes.js";

describe("#Routes test suite", () => {
  const request = TestUtil.generateReadableStream(["some file bytes"]);
  const response = TestUtil.generateWritableStream(() => {});
  const defaultParams = {
    request: Object.assign(request, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      method: "",
      body: {},
    }),
    response: Object.assign(response, {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn(),
    }),
    values: () => Object.values(defaultParams),
  };

  describe("#setSocketInstace", () => {
    test("setSocket should store io instance", () => {
      const routes = new Routes();

      const ioObj = {
        to: (id) => ioObj,
        emit: (event, message) => {},
      };

      routes.setSocketInstance(ioObj);
      expect(routes.io).toStrictEqual(ioObj);
    });
  });

  describe("#handler", () => {
    test("Given an inexistent route, it should choose default route.", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };

      params.request.method = "inexistent";
      await routes.handler(...params.values());
      expect(params.response.end).toHaveBeenCalledWith("Hello, #Default!");
    });

    test("It should set any request with CORS enabled.", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };

      params.request.method = "inexistent";
      await routes.handler(...params.values());
      expect(params.response.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*"
      );
    });

    test("Given method OPTIONS, it should choose options routes.", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };

      params.request.method = "OPTIONS";
      await routes.handler(...params.values());
      expect(params.response.writeHead).toHaveBeenCalledWith(204);
      expect(params.response.end).toHaveBeenCalledWith("Hello, #Options!");
    });

    test("Given method GET, it should choose get routes.", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };

      params.request.method = "GET";
      jest.spyOn(routes, routes.get.name).mockResolvedValue();

      await routes.handler(...params.values());
      expect(routes.get).toHaveBeenCalled();
    });

    test("Given method POST, it should choose post routes.", async () => {
      const routes = new Routes();
      const params = {
        ...defaultParams,
      };

      params.request.method = "POST";
      jest.spyOn(routes, routes.post.name).mockResolvedValue();

      await routes.handler(...params.values());
      expect(routes.post).toHaveBeenCalled();
    });
  });

  describe("#get", () => {
    test("Given method GET it should list all files downloaded.", async () => {
      const routes = new Routes();

      const params = {
        ...defaultParams,
      };

      const filesStatusesMock = [
        {
          size: "430 B",
          lastModified: "2021-09-06T15:21:44.020Z",
          owner: "apolonio",
          file: "temp.txt",
        },
      ];

      jest
        .spyOn(routes.fileHelper, routes.fileHelper.getFilesStatus.name)
        .mockResolvedValue(filesStatusesMock);

      params.request.method = "GET";
      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(200);
      expect(params.response.end).toHaveBeenCalledWith(
        JSON.stringify(filesStatusesMock)
      );
    });
  });

  describe("#post", () => {
    test("It should validade post route workflow", async () => {
      const routes = new Routes("/tmp");

      const options = {
        ...defaultParams,
      };

      options.request.method = "POST";
      options.request.url = "?socketId=10";

      jest
        .spyOn(
          UploadHandler.prototype,
          UploadHandler.prototype.registerEvents.name
        )
        .mockImplementation((headers, onFinish) => {
          const writable = TestUtil.generateWritableStream(() => {});
          writable.on("finish", onFinish);

          return writable;
        });

      await routes.handler(...options.values());

      expect(UploadHandler.prototype.registerEvents).toHaveBeenCalled();
      expect(options.response.writeHead).toHaveBeenCalledWith(200);
      const exepectedEndResult = JSON.stringify({
        result: "Files uploaded with success!",
      });
      expect(options.response.end).toHaveBeenCalledWith(
        exepectedEndResult
      );
    });
  });
});
