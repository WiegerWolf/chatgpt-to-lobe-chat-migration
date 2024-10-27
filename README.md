# chatgpt-to-lobe-chat-migration

1. Export chat history from chatgpt.com: Profile -> Settings -> Data Controls -> Export Data -> Export
2. Data will be sent to your email; download and put downloaded zip file into `input` folder
3. Run `deno run --allow-all main.ts`
4. Chat history will be converted to lobe.ai format and saved in `output` folder
5. Profile -> Import Configuration
6. Profit!

## Error: message_client_id_user_unique

There is a possibility of multiple messages with exact same uuid in chatgpt.com data export.
This will cause an error when importing to lobe chat:

```
duplicate key value violates unique constraint "message_client_id_user_unique"
```

Even though it says "message_client_id_user_unique", it is not related to `client_id` or `user_id`
fields in `messages` table. It actually refers to `id` field in two messages being the same.

Consider this example:

```json
// topic 1
{
    "title": "Using TypeScript Guide",
    "favorite": 0,
    "sessionId": "inbox",
    "createdAt": 1727395939596,
    "id": "66f5f863-5488-800f-b47c-f7e937e15140",
    "updatedAt": 1727395951222
},
    // messages in topic 1
    {
        "role": "user",
        "content": "how to use typescript?",
        "files": [],
        "sessionId": "inbox",
        "topicId": "66f5f863-5488-800f-b47c-f7e937e15140",
        "createdAt": 1727395939617,
        "id": "aaa214dc-8a2e-45fe-96c6-ee1bb5291161",
        "updatedAt": 1727395951222,
        "extra": {},
        "meta": {},
        "userId": "user_2lOQYUvnChKlyTyOlG86ZPFGbIF"
    },
        {
            "role": "assistant",
            "content": "",
            "files": [],
            "sessionId": "inbox",
            "topicId": "66f5f863-5488-800f-b47c-f7e937e15140",
            "createdAt": 1727395949729,
            "id": "6755ba14-475e-48c4-b5a3-c8c62d76b1ed",
            "updatedAt": 1727395951222,
            "extra": {
                "fromModel": "gpt-4o",
                "fromProvider": "openai"
            },
            "meta": {},
            "userId": "user_2lOQYUvnChKlyTyOlG86ZPFGbIF",
            "parentId": "aaa214dc-8a2e-45fe-96c6-ee1bb5291161"
        },

// topic 2
{
    "title": "",
    "favorite": 0,
    "sessionId": "inbox",
    "createdAt": 1727395921380,
    "id": "66f5f851-2e90-800f-a5d7-eaf09cc82dd4",
    "updatedAt": 1727395936982
},
    // messages in topic 2
    {
        "role": "user",
        "content": "how to use typescript?",
        "files": [],
        "sessionId": "inbox",
        "topicId": "66f5f851-2e90-800f-a5d7-eaf09cc82dd4",
        "createdAt": 1727395921390,
        "id": "aaa214dc-8a2e-45fe-96c6-ee1bb5291161",
        "updatedAt": 1727395936982,
        "extra": {},
        "meta": {},
        "userId": "user_2lOQYUvnChKlyTyOlG86ZPFGbIF"
    },
        {
            "role": "assistant",
            "content": "",
            "files": [],
            "sessionId": "inbox",
            "topicId": "66f5f851-2e90-800f-a5d7-eaf09cc82dd4",
            "createdAt": 1727395936050,
            "id": "e9402462-7d10-496f-ad40-e4a092afd8f3",
            "updatedAt": 1727395936982,
            "extra": {
                "fromModel": "gpt-4o",
                "fromProvider": "openai"
            },
            "meta": {},
            "userId": "user_2lOQYUvnChKlyTyOlG86ZPFGbIF",
            "parentId": "aaa214dc-8a2e-45fe-96c6-ee1bb5291161"
        },
```

There are two `user` messages with same id `aaa214dc-8a2e-45fe-96c6-ee1bb5291161`. But they belong to two *different* topics:
`66f5f863-5488-800f-b47c-f7e937e15140` and `66f5f851-2e90-800f-a5d7-eaf09cc82dd4`. While chatGPT is able to process
such structure, lobe chat importer will not be able to handle it.

In such cases, you can go to the server logs for your lobe chat instance and check the
error message. It will point to a specific message that has the same uuid. Just delete the duplicates
until there's only one left.

Then you can reimport the data, hopefully without issues.