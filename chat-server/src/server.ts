import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.get("/", (_req, res) => res.send("Socket server running"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:3000"], credentials: true },
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

io.on("connection", (socket) => {
  console.log("✅ connected:", socket.id);

  // 방 입장
  socket.on("join", async ({ chatId, userId }) => {
    socket.join(chatId);
    console.log(`${userId} joined chat ${chatId}`);
    socket.to(chatId).emit("system", `${userId} joined`);
  });

  // 메시지 전송
  socket.on("chat:message", async ({ chatId, senderId, content }) => {
    const { data, error } = await supabase
      .from("Messages")
      .insert([{ chat_id: chatId, sender_id: senderId, content }])
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return;
    }

    io.to(chatId).emit("chat:message", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Socket.io running on port ${PORT}`));
