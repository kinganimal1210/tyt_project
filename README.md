# Team Matching Platform

chat-server에서 npm install
.env파일 만들기

PORT=4000
SUPABASE_URL=여기에 url
SUPABASE_SERVICE_ROLE_KEY=여기에 service role key

frontend에서 npm install
.env.local파일 만들기

NEXT_PUBLIC_CHAT_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=여기에 url
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에 anon key
SUPABASE_SERVICE_ROLE_KEY=여기에 service role key

터미널 2개로 chat-server, frontend 각각 가서 npm run dev 각각 실행