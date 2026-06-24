-- Coach — chat history for the in-app coach (run once).
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  role        text not null,                 -- 'user' | 'assistant'
  content     text not null,
  meta        jsonb default '{}'::jsonb,      -- e.g. {actions: ["moved Sat long to Sun"]}
  created_at  timestamptz default now()
);
alter table chat_messages enable row level security;
create index if not exists idx_chat_created on chat_messages (created_at);
