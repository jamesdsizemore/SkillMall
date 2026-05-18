-- Rename and retype the embedding column from TEXT to BLOB.
-- knowledge_chunks.embedding_json was declared TEXT but stored binary Float32Array bytes.
-- This migration creates a new table with the correct schema and copies data.

CREATE TABLE IF NOT EXISTS knowledge_chunks_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_base_id INTEGER NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_file TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding BLOB  -- Float32Array bytes; NULL until embeddings are generated
);

-- Migrate existing rows (embedding column may be empty in dev, but preserve data)
INSERT INTO knowledge_chunks_new (id, knowledge_base_id, content, source_file, chunk_index, embedding)
SELECT id, knowledge_base_id, content, source_file, chunk_index, embedding_json
FROM knowledge_chunks;

DROP TABLE knowledge_chunks;
ALTER TABLE knowledge_chunks_new RENAME TO knowledge_chunks;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_kb ON knowledge_chunks(knowledge_base_id);
