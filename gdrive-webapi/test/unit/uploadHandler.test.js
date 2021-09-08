import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import fs from "fs";
import UploadHandler from "../../src/uploadHandler.js";
import TestUtil from "../_utils/testUtil.js";
import { resolve } from "path";
import { pipeline } from "stream/promises";
import { logger } from "../../src/logger.js";

describe("#Upload test suite", () => {
  const ioObj = {
    to: (id) => ioObj,
    emit: (event, message) => {},
  };

  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  describe("#registerEvents", () => {
    test("Should call onFile and onFinish functions on BusBoy instance", () => {
      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: "01",
      });

      jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue();

      const headers = {
        "content-type": "multipart/form-data; boundary=",
      };

      const onFinish = jest.fn();
      const busboyInstance = uploadHandler.registerEvents(headers, onFinish);

      uploadHandler.registerEvents(headers, onFinish);

      const fileStream = TestUtil.generateReadableStream([
        "chunk",
        "of",
        "data",
      ]);
      busboyInstance.emit("file", "fieldName", fileStream, "filename.txt");

      busboyInstance.listeners("finish")[0].call();
      expect(uploadHandler.onFile).toHaveBeenCalled();
      expect(onFinish).toHaveBeenCalled();
    });
  });

  describe("#onFile", () => {
    test("Given a stream file, it should save it on disk", async () => {
      const chunks = ["hey", "dude"];
      const downloadsFolder = "/tmp";
      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: "01",
        downloadsFolder,
      });

      const onData = jest.fn();
      const onTransform = jest.fn();

      jest
        .spyOn(fs, fs.createWriteStream.name)
        .mockImplementation(() => TestUtil.generateWritableStream(onData));
      jest
        .spyOn(uploadHandler, uploadHandler.handleFileBytes.name)
        .mockImplementation(() =>
          TestUtil.generateTransformStream(onTransform)
        );

      const params = {
        fieldName: "video",
        file: TestUtil.generateReadableStream(chunks),
        fileName: "mockFile.mov",
      };

      await uploadHandler.onFile(...Object.values(params));

      expect(onData.mock.calls[0].join()).toEqual(chunks.join());
      expect(onTransform.mock.calls[0].join()).toEqual(chunks.join());

      const expectedFileName = resolve(
        uploadHandler.downloadsFolder,
        params.fileName
      );
      expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFileName);
    });
  });

  describe("#handleFileBytes", () => {
    test("Should call emit function and is is a transform stream", async () => {
      jest.spyOn(ioObj, ioObj.to.name);
      jest.spyOn(ioObj, ioObj.emit.name);

      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: "01",
      });

      jest
        .spyOn(uploadHandler, uploadHandler.canExecute.name)
        .mockReturnValue(true);

      const messages = ["Hello", "World"];
      const source = TestUtil.generateReadableStream(messages);
      const onWrite = jest.fn();
      const target = TestUtil.generateWritableStream(onWrite);

      await pipeline(
        source,
        uploadHandler.handleFileBytes("filename.txt"),
        target
      );

      expect(ioObj.to).toHaveBeenCalledTimes(messages.length);
      expect(ioObj.emit).toHaveBeenCalledTimes(messages.length);

      expect(onWrite).toHaveBeenCalledTimes(messages.length);
      expect(onWrite.mock.calls[0].join()).toEqual(messages.join());
    });

    test("Given message timerDelay as 2secs, it should emit only two messages during 3 seconds", async () => {
      jest.spyOn(ioObj, ioObj.emit.name);
      const messageTimeDelay = 2000;
      const uploadHandler = new UploadHandler({
        io: ioObj,
        socketId: "01",
        messageTimeDelay,
      });

      const day = "2021-07-01 01:01";
      const onInitVariable = TestUtil.getTimeFromDate(`${day}:00`);
      const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`);
      const onFirstUpdateLastMessage = onFirstCanExecute;
      const onSecondaCanExecute = TestUtil.getTimeFromDate(`${day}:03`);
      const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`);

      TestUtil.mockDateNow([
        onInitVariable,
        onFirstCanExecute,
        onFirstUpdateLastMessage,
        onSecondaCanExecute,
        onThirdCanExecute,
      ]);

      const messages = ["hello", "hello", "world"];
      const filename = "filename.avi";
      const expectedMessageSent = 2;

      const source = TestUtil.generateReadableStream(messages);

      await pipeline(source, uploadHandler.handleFileBytes(filename));

      expect(ioObj.emit).toHaveBeenCalledTimes(expectedMessageSent);

      const firstCallResult = ioObj.emit.mock.calls[0];
      const secondCallResult = ioObj.emit.mock.calls[1];
      expect(firstCallResult).toEqual([
        uploadHandler.ON_UPLOAD_EVENT,
        { proccessedAlready: messages.length, filename },
      ]);

      expect(secondCallResult).toEqual([
        uploadHandler.ON_UPLOAD_EVENT,
        { proccessedAlready: messages.length * messages.length, filename },
      ]);
    });
  });

  describe("#canExecute", () => {
    test("Should return true when time is later than specified delay", () => {
      const timerDelay = 1000;
      const uploadHandler = new UploadHandler({
        io: {},
        socketId: "",
        messageTimeDelay: timerDelay,
      });
      const tickNow = TestUtil.getTimeFromDate("2021-07-01 00:00:03");
      TestUtil.mockDateNow([tickNow]);
      const lastExecution = TestUtil.getTimeFromDate("2021-07-01 00:00:00");

      const result = uploadHandler.canExecute(lastExecution);

      expect(result).toBeTruthy();
    });

    test("Should return false when time is ealier than specified delay", () => {
      const timerDelay = 3000;
      const uploadHandler = new UploadHandler({
        io: {},
        socketId: "",
        messageTimeDelay: timerDelay,
      });
      const now = TestUtil.getTimeFromDate("2021-07-01 00:00:01");
      TestUtil.mockDateNow([now]);
      const lastExecution = TestUtil.getTimeFromDate("2021-07-01 00:00:00");

      const result = uploadHandler.canExecute(lastExecution);

      expect(result).toBeFalsy();
    });
  });
});
