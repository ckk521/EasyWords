import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { encrypt, decrypt, generateEncryptionKey } from './encryption'

describe('Encryption', () => {
  const originalKey = process.env.ENCRYPTION_KEY
  const testKey = generateEncryptionKey()

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = testKey
  })

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalKey
  })

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey()
      expect(key).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(key)).toBe(true)
    })

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()
      expect(key1).not.toBe(key2)
    })
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'my-secret-api-key'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'my-secret-api-key'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)

      // 由于 IV 随机，每次加密结果不同
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty string', () => {
      const plaintext = ''
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle special characters', () => {
      const plaintext = 'sk-12345!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 Hello World'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for invalid encrypted data', () => {
      expect(() => decrypt('invalid-format')).toThrow()
    })

    it('should throw error if ENCRYPTION_KEY not set', () => {
      delete process.env.ENCRYPTION_KEY
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY 环境变量未配置')
    })
  })
})
