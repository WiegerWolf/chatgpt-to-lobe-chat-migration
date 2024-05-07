import { extname } from "https://deno.land/std@0.224.0/path/mod.ts";
import * as zip from "jsr:@zip-js/zip-js";

const {
  INPUT_DIR = './input',
  OUTPUT_DIR = './output',
  LOOK_FOR_FILETYPE = '.zip',
  CONVERSATIONS_FILE = 'conversations.json',
} = Deno.env.toObject();

async function main() {
  for await (const dirEntry of Deno.readDir(INPUT_DIR)) {
    if (!dirEntry.isFile) {
      continue;
    }
    const inputFilePath = `${INPUT_DIR}/${dirEntry.name}`;
    const inputFileExtension = extname(dirEntry.name);
    if (inputFileExtension=== LOOK_FOR_FILETYPE) {
      const zipFile = await Deno.open(inputFilePath);
      const zipReader = new zip.ZipReader(zipFile);
      const zipEntries = await zipReader.getEntries();
      for await (const zipEntry of zipEntries) {
        if (!zipEntry||!zipEntry.getData) {
          continue;
        }
        if (zipEntry.filename !== CONVERSATIONS_FILE) {
          continue;
        }
        const zipTextWriter = new zip.TextWriter();
        const zipEntryData = await zipEntry.getData(zipTextWriter)
        try {
          const json = JSON.parse(zipEntryData);
          // TODO: write to output file after parsing and converting to lobe format
        } catch (e) {
          console.error(e);
          continue;
        }
      }
      zipFile.close();
    }
  }
}

main();