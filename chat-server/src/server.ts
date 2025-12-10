import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

// 허용된 프론트엔드 Origin 목록 (쉼표로 구분)
const allowedOrigins = (process.env.FRONTEND_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();

// CORS 설정: 프론트엔드(로컬 + Vercel 도메인 등)에서 접근 허용
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.get("/", (_req, res) => res.send("Socket server running"));

const server = http.createServer(app);

// Socket.io 서버에도 동일한 CORS 설정 적용
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Supabase 클라이언트 (Service Role 키 사용)
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
server.listen(PORT, () =>
  console.log(`🚀 Socket.io running on port ${PORT} (origins: ${allowedOrigins.join(", ")})`)
);
