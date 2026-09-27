CREATE TABLE IF NOT EXISTS telegram_chat_sessions (
  user_id TEXT PRIMARY KEY,
  stage TEXT NOT NULL,
  category TEXT,
  service_id INTEGER,
  day TEXT,
  time TEXT,
  name TEXT,
  phone TEXT,
  updated_at TEXT NOT NULL
);
