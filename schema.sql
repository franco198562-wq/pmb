CREATE TABLE IF NOT EXISTS site_data (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_data (id, data)
VALUES (1, '{"departments":[],"books":[]}');
