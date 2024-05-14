import { extname } from "https://deno.land/std@0.224.0/path/mod.ts";
import * as zip from "jsr:@zip-js/zip-js";

const {
  INPUT_DIR = './input',
  OUTPUT_DIR = './output',
  LOOK_FOR_FILETYPE = '.zip',
  CONVERSATIONS_FILE = 'conversations.json',
} = Deno.env.toObject();

interface ChatGPTConversationMessageAuthor {
  metadata: {};
  name?: string;
  role: 'system' | 'assistant';
}

interface ChatGPTConversationMessageContent {
  content_type: 'text';
  parts: string[];
}

interface ChatGPTConversationMessageMetadata {
  citations: [];
  is_visually_hidden_from_conversation?: boolean;
  default_model_slug?: string;
  finish_details?: {
    stop_tokens: number[];
    type: 'stop';
  }
  gizmo_id?: null;
  is_complete?: boolean;
  message_type?: null;
  model_slug?: string; // 'gpt-4'
  pad?: string; // ??
  parent_id?: string; // uuid
  requset_id?: string; // NOT uuid
  timestamp?: 'absolute'; 
}

interface ChatGPTConversationMessage {
  author: ChatGPTConversationMessageAuthor;
  content: ChatGPTConversationMessageContent;
  create_time?: number; // unix timestamp.microseconds
  end_turn: boolean;
  id: string; // uuid
  metadata: ChatGPTConversationMessageMetadata;
  
  recipient: string; // 'all'
  status: string; // 'finished_successfully'
  update_time?: null;
  weight: number; // 0 ??
}

interface ChatGPTConversationMappingNode {
  id: string; // uuid
  parent: string; // uuid
  message: ChatGPTConversationMessage;
  children: string[]; // uuids
}

interface ChatGPTConversationMapping {
  [key: string]: ChatGPTConversationMappingNode;
}

interface ChatGPTConversation {
  conversation_id: string; // uuid
  conversation_template_id?: string;
  create_time: number; // unix timestamp.microseconds
  current_node: string; // uuid of ??
  default_model_slug: string; // 'gpt-4' etc
  gizmo_id?: string; // ??
  id: string; // uuid
  is_archived: boolean;
  mapping: ChatGPTConversationMapping;
  moderation_results: []; // ??
  plugin_ids?: null; // ??
  safe_urls: string[]; // ??
  title: string;
  update_time: number; // unix timestamp.microseconds
}

function formatDateToTZ(
  date: Date, 
  tz: string = 'Europe/Amsterdam'
): string {
  const formatter1 = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: tz,
  });
  return formatter1.format(date);
}

function unixTimestampFloatMicrosecondsToDate(timestamp: number): Date {
  return new Date(timestamp*1e3);
}

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
        let conversations: ChatGPTConversation[];
        try {
          conversations = JSON.parse(zipEntryData);
        } catch (e) {
          console.error(e);
          continue;
        }
        for (const conversation of conversations) {
          const {
            create_time,
          } = conversation;
          console.log(formatDateToTZ(unixTimestampFloatMicrosecondsToDate(create_time), 'America/New_York'))
          debugger
        }
      }
      zipFile.close();
    }
  }
}

main();