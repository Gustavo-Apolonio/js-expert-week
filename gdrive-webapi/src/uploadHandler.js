import BusBoy from "busboy";
import { pipeline } from "stream/promises";
import fs from "fs";
import { logger } from "./logger.js";

export default class UploadHandler {
  constructor({ io, socketId, downloadsFolder, messageTimeDelay = 200 }) {
    this.io = io;
    this.socketId = socketId;
    this.downloadsFolder = downloadsFolder;
    this.ON_UPLOAD_EVENT = "file-upload";
    this.messageTimeDelay = messageTimeDelay;
  }

  canExecute(lastExecution) {
    return Date.now() - lastExecution >= this.messageTimeDelay;
  }

  handleFileBytes(filename) {
    this.lastMessageSent = Date.now();

    async function* handleData(source) {
      let proccessedAlready = 0;

      for await (const chunk of source) {
        yield chunk;
        proccessedAlready += chunk.length;

        if (!this.canExecute(this.lastMessageSent)) continue;

        this.io.to(this.socketId).emit(this.ON_UPLOAD_EVENT, {
          proccessedAlready,
          filename,
        });
        logger.info(
          `File [${filename}] | ${proccessedAlready} bytes proccessed to ${this.socketId}`
        );
        this.lastMessageSent = Date.now();
      }
    }

    return handleData.bind(this);
  }

  async onFile(fieldName, file, fielName) {
    const saveTo = `${this.downloadsFolder}/${fielName}`;
    await pipeline(
      file,
      this.handleFileBytes.apply(this, [fielName]),
      fs.createWriteStream(saveTo)
    );

    logger.info(`File [${fielName}] | Finished.`);
  }

  registerEvents(headers, onFinish) {
    const busboy = new BusBoy({ headers });

    busboy.on("file", this.onFile.bind(this));
    busboy.on("finish", onFinish);

    return busboy;
  }
}
