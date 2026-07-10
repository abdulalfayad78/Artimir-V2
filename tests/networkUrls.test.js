import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createNetworkUrls,
  normalizePublicAppOrigin,
} from '../server/network.js'
import {
  createAllowedOrigins,
  createCorsOriginValidator,
} from '../server/cors.js'

test('phone URL uses the public app origin while preserving the session query', () => {
  const urls = createNetworkUrls({
    localAddress: '10.0.0.8',
    clientPort: 5173,
    clientProtocol: 'http',
    publicAppOrigin: 'https://app.artimir.fr/some-path',
    sessionId: 'ABC123',
  })

  assert.equal(
    urls.phoneUrl,
    'https://app.artimir.fr/#/phone/languages?session=ABC123',
  )
})

test('phone URL falls back to the local browser-accessible origin', () => {
  const urls = createNetworkUrls({
    localAddress: '10.0.0.8',
    clientPort: 5173,
    clientProtocol: 'http',
    sessionId: 'ABC123',
  })

  assert.equal(
    urls.phoneUrl,
    'http://10.0.0.8:5173/#/phone/languages?session=ABC123',
  )
})

test('session code is URL encoded in generated phone URLs', () => {
  const urls = createNetworkUrls({
    publicAppOrigin: 'https://app.artimir.fr',
    sessionId: 'AB C+1',
  })

  assert.equal(
    urls.phoneUrl,
    'https://app.artimir.fr/#/phone/languages?session=AB%20C%2B1',
  )
})

test('public app origin normalization rejects invalid values', () => {
  assert.equal(
    normalizePublicAppOrigin('https://app.artimir.fr/phone'),
    'https://app.artimir.fr',
  )
  assert.equal(normalizePublicAppOrigin('not a url'), null)
})

test('CORS allows local development and configured public origins only', async () => {
  const allowedOrigins = createAllowedOrigins({
    clientPort: 5173,
    clientProtocol: 'http',
    localAddress: '10.0.0.8',
    publicAppOrigins: ['https://app.artimir.fr'],
  })
  const validate = createCorsOriginValidator(allowedOrigins)

  const check = (origin) =>
    new Promise((resolve, reject) => {
      validate(origin, (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve(result)
      })
    })

  assert.equal(await check('http://localhost:5173'), true)
  assert.equal(await check('http://127.0.0.1:5173'), true)
  assert.equal(await check('http://10.0.0.8:5173'), true)
  assert.equal(await check('https://app.artimir.fr'), true)
  assert.equal(await check('https://evil.example'), false)
})
