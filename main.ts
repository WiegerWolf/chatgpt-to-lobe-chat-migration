import { extname } from "https://deno.land/std@0.224.0/path/mod.ts";
import * as zip from "jsr:@zip-js/zip-js";

const {
  INPUT_DIR = "./input",
  OUTPUT_DIR = "./output",
  LOOK_FOR_FILETYPE = ".zip",
  USER_ID = "user_2lOQYUvnChKlyTyOlG86ZPFGbIF", // make sure this is the same as un `users` table in your lobe chat database
  CONVERSATIONS_FILE = "conversations.json",
} = Deno.env.toObject();

interface ChatGPTConversationMessageAuthor {
  metadata: Record<string | number | symbol, never>;
  name?: string;
  role: "system" | "assistant";
}

interface ChatGPTConversationMessageContent {
  content_type: "text" | "multimodal_text";
  parts: string[];
}

interface ChatGPTConversationMessageMetadata {
  citations: [];
  is_visually_hidden_from_conversation?: boolean;
  default_model_slug?: string;
  finish_details?: {
    stop_tokens: number[];
    type: "stop";
  };
  gizmo_id?: null;
  is_complete?: boolean;
  message_type?: null;
  model_slug?: string; // 'gpt-4'
  pad?: string; // ??
  parent_id?: string; // uuid
  requset_id?: string; // NOT uuid
  timestamp?: "absolute";
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

type LobeChatTopic = {
  title: string;
  favorite: number;
  sessionId: string;
  createdAt: number;
  id: string;
  updatedAt: number;
};

type LobeChatMessage = {
  role: string;
  content: string;
  files: string[];
  parentId?: string;
  sessionId: string;
  topicId: string;
  createdAt: number;
  id: string;
  updatedAt: number;
  extra: {
    fromModel?: string;
    fromProvider?: string;
  };
  meta: Record<string | number | symbol, never>;
  userId: string;
  clientId?: string;
};

function convertTime(time: number): number {
  return Math.round(time * 1e3);
}

function sanitizeText(text: string): string {
  // make sure the text doesn't contain any unicode ambiguities or control characters
  // deno-lint-ignore no-control-regex
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}

async function processConversations(conversations: ChatGPTConversation[]) {
  const DEFAULT_SESSION_ID = "inbox";
  const res = {
    exportType: "sessions",
    version: 7,
    state: {
      sessions: [],
      sessionGroups: [],
      messages: [] as LobeChatMessage[],
      topics: [] as LobeChatTopic[],
    },
  };

  for (const conversation of conversations) {
    res.state.topics.push({
      title: sanitizeText(conversation.title),
      favorite: 0,
      sessionId: DEFAULT_SESSION_ID,
      createdAt: convertTime(conversation.create_time),
      id: conversation.id,
      updatedAt: convertTime(conversation.update_time),
    });

    for (const [key, value] of Object.entries(conversation.mapping)) {
      const { message } = value;
      if (!message) continue;
      if (message.author.role === "system") continue;
      if (message.content.content_type !== "text") continue;
      const { metadata } = message;
      const msgObj: LobeChatMessage = {
        role: message.author.role,
        content: sanitizeText(message.content.parts.join(" ")),
        files: [],
        sessionId: DEFAULT_SESSION_ID,
        topicId: conversation.id,
        createdAt: convertTime(message.create_time || conversation.create_time),
        id: key,
        updatedAt: convertTime(message.update_time || conversation.update_time),
        extra: {},
        meta: {},
        userId: USER_ID,
      };
      if (metadata.parent_id) {
        msgObj.parentId = metadata.parent_id;
      }
      if (message.author.role === "assistant") {
        msgObj.extra.fromModel = metadata.model_slug || "gpt-4o";
        msgObj.extra.fromProvider = "openai";
      }
      res.state.messages.push(msgObj);
    }
  }

  // write to file
  const outputFilePath = `${OUTPUT_DIR}/LobeChat-sessions-v7.json`;
  const output = JSON.stringify(res, null, 2);
  await Deno.writeTextFile(outputFilePath, output);
}

async function main() {
  for await (const dirEntry of Deno.readDir(INPUT_DIR)) {
    if (!dirEntry.isFile) {
      continue;
    }
    const inputFilePath = `${INPUT_DIR}/${dirEntry.name}`;
    const inputFileExtension = extname(dirEntry.name);
    if (inputFileExtension === LOOK_FOR_FILETYPE) {
      const zipFile = await Deno.open(inputFilePath);
      const zipReader = new zip.ZipReader(zipFile);
      const zipEntries = await zipReader.getEntries();
      for await (const zipEntry of zipEntries) {
        if (!zipEntry || !zipEntry.getData) {
          continue;
        }
        if (zipEntry.filename !== CONVERSATIONS_FILE) {
          continue;
        }
        const zipTextWriter = new zip.TextWriter();
        const zipEntryData = await zipEntry.getData(zipTextWriter);
        let conversations: ChatGPTConversation[];
        try {
          conversations = JSON.parse(zipEntryData);
        } catch (e) {
          console.error(e);
          continue;
        }
        await processConversations(conversations);
      }
    }
  }
}

main();
