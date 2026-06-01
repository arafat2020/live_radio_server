import { pgTable, text, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tracks = pgTable('tracks', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  artist: text('artist'),
  duration: integer('duration').notNull(),
  minioKey: text('minio_key').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
});
