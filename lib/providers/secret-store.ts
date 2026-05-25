import crypto from 'crypto'
import fs from 'fs'
import fsp from 'fs/promises'
import os from 'os'
import path from 'path'

type StoredSecretEnvelope = {
  version: 1
  algorithm: 'aes-256-gcm'
  iv: string
  authTag: string
  ciphertext: string
  updatedAt: string
}

type SecretStoreFile = {
  version: 1
  secrets: Record<string, StoredSecretEnvelope>
}

const DEFAULT_DIR = path.join(os.homedir(), '.skill-mall')

function secretsPath(): string {
  return process.env.SKILL_MALL_SECRETS_PATH ?? path.join(DEFAULT_DIR, 'secrets.json')
}

function keyPath(): string {
  return process.env.SKILL_MALL_SECRETS_KEY_PATH ?? path.join(DEFAULT_DIR, 'secrets.key')
}

function secretIdPattern(value: string): boolean {
  return /^[A-Za-z0-9_.:-]+$/.test(value)
}

export function storedApiKeySecretId(providerRegistryId: string): string {
  const normalized = providerRegistryId.trim()
  if (!secretIdPattern(normalized)) {
    throw new Error('Provider registry id is not valid for stored API-key secrets')
  }
  return `provider:${normalized}:api_key`
}

async function readOrCreateMasterKey(): Promise<Buffer> {
  const file = keyPath()
  try {
    const raw = (await fsp.readFile(file, 'utf-8')).trim()
    const key = Buffer.from(raw, 'base64')
    if (key.length !== 32) throw new Error('Invalid SkillMall secret-store key length')
    return key
  } catch (error) {
    if (error instanceof Error && !('code' in error)) throw error
    const key = crypto.randomBytes(32)
    await fsp.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
    await fsp.writeFile(file, key.toString('base64') + '\n', { mode: 0o600 })
    return key
  }
}

async function readStore(): Promise<SecretStoreFile> {
  try {
    return JSON.parse(await fsp.readFile(secretsPath(), 'utf-8')) as SecretStoreFile
  } catch {
    return { version: 1, secrets: {} }
  }
}

function readOrCreateMasterKeySync(): Buffer {
  const file = keyPath()
  try {
    const raw = fs.readFileSync(file, 'utf-8').trim()
    const key = Buffer.from(raw, 'base64')
    if (key.length !== 32) throw new Error('Invalid SkillMall secret-store key length')
    return key
  } catch (error) {
    if (error instanceof Error && !('code' in error)) throw error
    const key = crypto.randomBytes(32)
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
    fs.writeFileSync(file, key.toString('base64') + '\n', { mode: 0o600 })
    return key
  }
}

function readStoreSync(): SecretStoreFile {
  try {
    return JSON.parse(fs.readFileSync(secretsPath(), 'utf-8')) as SecretStoreFile
  } catch {
    return { version: 1, secrets: {} }
  }
}

async function writeStore(store: SecretStoreFile): Promise<void> {
  const file = secretsPath()
  await fsp.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  await fsp.writeFile(file, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 })
  try {
    fs.chmodSync(file, 0o600)
  } catch {}
}

function assertSecretId(secretId: string): string {
  const id = secretId.trim()
  if (!secretIdPattern(id)) throw new Error('Secret id must be a non-path reference id')
  return id
}

export async function writeStoredApiKey(secretId: string, value: string): Promise<{ id: string; valuePresent: boolean }> {
  const id = assertSecretId(secretId)
  if (!value.trim()) throw new Error('API key is required')

  const key = await readOrCreateMasterKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const store = await readStore()
  store.secrets[id] = {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    updatedAt: new Date().toISOString(),
  }
  await writeStore(store)
  return { id, valuePresent: true }
}

export async function readStoredApiKey(secretId: string): Promise<string | undefined> {
  const id = assertSecretId(secretId)
  const envelope = (await readStore()).secrets[id]
  if (!envelope) return undefined
  const key = await readOrCreateMasterKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf-8')
}

export function readStoredApiKeySync(secretId: string): string | undefined {
  const id = assertSecretId(secretId)
  const envelope = readStoreSync().secrets[id]
  if (!envelope) return undefined
  const key = readOrCreateMasterKeySync()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf-8')
}

export async function storedSecretValuePresent(secretId: string): Promise<boolean> {
  const id = assertSecretId(secretId)
  return Boolean((await readStore()).secrets[id])
}

export function storedSecretValuePresentSync(secretId: string): boolean {
  const id = assertSecretId(secretId)
  return Boolean(readStoreSync().secrets[id])
}

export async function deleteStoredApiKey(secretId: string): Promise<{ id: string; valuePresent: false }> {
  const id = assertSecretId(secretId)
  const store = await readStore()
  delete store.secrets[id]
  await writeStore(store)
  return { id, valuePresent: false }
}
