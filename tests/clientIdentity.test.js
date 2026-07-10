import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearClientSession,
  getOrCreateClientId,
  readStorage,
  storageKeys,
  storeClientSession,
} from '../frontend/src/realtime/clientIdentity.js'

test('phone identity remains stable when Safari storage APIs are unavailable', () => {
  const originalLocalStorage = globalThis.localStorage
  const originalSessionStorage = globalThis.sessionStorage
  const originalDocument = globalThis.document
  let cookie = ''
  const blockedStorage = {
    getItem() {
      throw new Error('storage blocked')
    },
    removeItem() {
      throw new Error('storage blocked')
    },
    setItem() {
      throw new Error('storage blocked')
    },
  }

  globalThis.localStorage = blockedStorage
  globalThis.sessionStorage = blockedStorage
  globalThis.document = {
    get cookie() {
      return cookie
    },
    set cookie(value) {
      cookie = value
    },
  }

  try {
    clearClientSession()
    const firstClientId = getOrCreateClientId('phone')
    const secondClientId = getOrCreateClientId('phone')

    assert.equal(secondClientId, firstClientId)

    storeClientSession('phone', 'A7K4P2')
    assert.equal(readStorage(storageKeys.role), 'phone')
    assert.equal(readStorage(storageKeys.sessionId), 'A7K4P2')
  } finally {
    globalThis.localStorage = originalLocalStorage
    globalThis.sessionStorage = originalSessionStorage
    globalThis.document = originalDocument
  }
})
