import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { ProviderRegistryID } from './types'
import type { StoredProviderSecretType } from '../llm/router/types'

export const SECRET_STORE_DIR = path.join(os.homedir(), '.skill-mall')
export const SECRET_STORE_PATH = path.join(SECRET_STORE_DIR, 'secrets.json')
const SECRET_KEY_PATH = path.join(SECRET_STORE_DIR, 'secrets.key')

type StoredSecretRecord = {
  providerRegistryId: ProviderRegistryID
  secretType: StoredProviderSecretType
  algorithm: 'aes-256-gcm'
  iv: string
  tag: string
  ciphertext: string
  createdAt: string
  updatedAt: string
}

type SecretStoreFile = {
  version: 1
  secrets: Record<string, StoredSecretRecord>
}

export function storedProviderSecretId(
  providerRegistryId: ProviderRegistryID,
  secretType: StoredProviderSecretType
): string {
  return `${providerRegistryId}:${secretType}`
}

function ensureStoreDir(): void {
  fs.mkdirSync(SECRET_STORE_DIR, { recursive: true, mode: 0o700 })
}

function loadOrCreateKey(): Buffer {
  ensureStoreDir()
  try {
    const existing = fs.readFileSync(SECRET_KEY_PATH)
    if (existing.length === 32) {
      fs.chmodSync(SECRET_KEY_PATH, 0o600)
      return existing
    }
  } catch {}

  const key = crypto.randomBytes(32)
  fs.writeFileSync(SECRET_KEY_PATH, key, { mode: 0o600 })
  return key
}

function readStore(): SecretStoreFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(SECRET_STORE_PATH, 'utf-8')) as SecretStoreFile
    if (parsed.version === 1 && parsed.secrets && typeof parsed.secrets === 'object') return parsed
  } catch {}
  return { version: 1, secrets: {} }
}

function writeStore(store: SecretStoreFile): void {
  ensureStoreDir()
  fs.writeFileSync(SECRET_STORE_PATH, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 })
  fs.chmodSync(SECRET_STORE_PATH, 0o600)
}

function encryptSecret(value: string): Pick<StoredSecretRecord, 'algorithm' | 'iv' | 'tag' | 'ciphertext'> {
  const key = loadOrCreateKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

function decryptSecret(record: StoredSecretRecord): string {
  const key = loadOrCreateKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf-8')
}

export function writeProviderSecret(input: {
  providerRegistryId: ProviderRegistryID
  secretType: StoredProviderSecretType
  value: string
}): { id: string; providerRegistryId: ProviderRegistryID; secretType: StoredProviderSecretType; valuePresent: true } {
  if (!input.value.trim()) throw new Error('Stored provider secret value is required')
  const store = readStore()
  const now = new Date().toISOString()
  const id = storedProviderSecretId(input.providerRegistryId, input.secretType)
  const previous = store.secrets[id]
  store.secrets[id] = {
    providerRegistryId: input.providerRegistryId,
    secretType: input.secretType,
    ...encryptSecret(input.value),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  writeStore(store)
  return { id, providerRegistryId: input.providerRegistryId, secretType: input.secretType, valuePresent: true }
}

export function readProviderSecret(id: string): string | undefined {
  const record = readStore().secrets[id]
  return record ? decryptSecret(record) : undefined
}

export function deleteProviderSecret(id: string): boolean {
  const store = readStore()
  const existed = Boolean(store.secrets[id])
  delete store.secrets[id]
  writeStore(store)
  return existed
}

export function getProviderSecretStatus(id: string): {
  type: 'stored_provider_secret'
  id: string
  valuePresent: boolean
  source: 'app_managed_encrypted_store'
} {
  return {
    type: 'stored_provider_secret',
    id,
    valuePresent: Boolean(readStore().secrets[id]),
    source: 'app_managed_encrypted_store',
  }
}
