#!/usr/bin/env node
'use strict'

/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const { runMigrations } = require('../lib/db/migrator')

const DB_PATH = path.join(process.cwd(), 'data', 'skillmall.db')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const result = runMigrations(db)

for (const file of result.applied) {
  console.log('Applied: ' + file)
}

console.log(result.applied.length === 0 ? 'No new migrations.' : result.applied.length + ' migration(s) applied.')

db.close()
