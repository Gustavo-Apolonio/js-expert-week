import { describe, test, expect, jest } from "@jest/globals";
import fs from "fs";
import FileHelper from "./../../src/fileHelper.js";

describe("#FileHelper test suite", () => {
  describe("#getFilesStatus", () => {
    test("It should return files status on correct format.", async () => {
      const statMock = {
        dev: 2051,
        mode: 33204,
        nlink: 1,
        uid: 1000,
        gid: 1000,
        rdev: 0,
        blksize: 4096,
        ino: 37165837,
        size: 430,
        blocks: 8,
        atimeMs: 1630941826024.005,
        mtimeMs: 1630941825908.0012,
        ctimeMs: 1630941825908.0012,
        birthtimeMs: 1630941704020.1194,
        atime: "2021-09-06T15:23:46.024Z",
        mtime: "2021-09-06T15:23:45.908Z",
        ctime: "2021-09-06T15:23:45.908Z",
        birthtime: "2021-09-06T15:21:44.020Z",
      };

      const mockUser = "apolonio";
      process.env.USER = mockUser;
      const fileName = "temp.txt";

      jest
        .spyOn(fs.promises, fs.promises.readdir.name)
        .mockResolvedValue([fileName]);

      jest
        .spyOn(fs.promises, fs.promises.stat.name)
        .mockResolvedValue(statMock);

      const result = await FileHelper.getFilesStatus("/tmp");

      const expectedResult = [
        {
          size: "430 B",
          lastModified: statMock.birthtime,
          owner: mockUser,
          file: fileName,
        },
      ];

      expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${fileName}`);
      expect(result).toMatchObject(expectedResult);
    });
  });
});
