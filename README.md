# chatgpt-to-lobe-chat-migration

1. Export chat history from chatgpt.com: Profile -> Settings -> Data Controls -> Export Data -> Export
2. Data will be sent to your email; download and unzip into `input` folder
3. Run `deno run --allow-all main.ts`
4. Chat history will be converted to lobe.ai format and saved in `output` folder
5. Profile -> Import Configuration
6. Profit!