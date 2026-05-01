import express from "express";
import cors from "cors";
import { env } from "./config.js";
import { conversationRouter } from "./routes/conversation.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/conversations", conversationRouter);

app.listen(env.SERVER_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${env.SERVER_PORT}`);
});
