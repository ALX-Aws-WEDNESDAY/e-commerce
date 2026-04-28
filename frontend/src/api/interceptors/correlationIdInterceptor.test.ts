import { describe, it, expect, beforeEach } from 'vitest'
import axios, { type AxiosInstance } from 'axios'
import { applyCorrelationIdInterceptor } from './correlationIdInterceptor'

describe('correlationIdInterceptor', () => {
  let client: AxiosInstance

  beforeEach(() => {
    // Create a fresh Axios instance for each test
    client = axios.create({
      baseURL: 'http://localhost:3000',
    })
    applyCorrelationIdInterceptor(client)
  })

  describe('Request Interceptor', () => {
    it('should attach a non-empty X-Correlation-ID header to every request', async () => {
      // Arrange: Mock the adapter to capture the request config
      let capturedConfig: any = null
      client.defaults.adapter = async (config) => {
        capturedConfig = config
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      // Act: Make a request
      await client.get('/test')

      // Assert: Verify the header is present and non-empty
      expect(capturedConfig).toBeTruthy()
      expect(capturedConfig.headers['X-Correlation-ID']).toBeTruthy()
      expect(typeof capturedConfig.headers['X-Correlation-ID']).toBe('string')
      expect(capturedConfig.headers['X-Correlation-ID'].length).toBeGreaterThan(0)
    })

    it('should attach a UUID v4 formatted X-Correlation-ID header', async () => {
      // Arrange: UUID v4 regex pattern
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      let capturedConfig: any = null
      client.defaults.adapter = async (config) => {
        capturedConfig = config
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      // Act: Make a request
      await client.get('/test')

      // Assert: Verify the header matches UUID v4 format
      expect(capturedConfig).toBeTruthy()
      const correlationId = capturedConfig.headers['X-Correlation-ID']
      expect(correlationId).toMatch(uuidV4Regex)
    })

    it('should store the correlation ID on config._correlationId', async () => {
      // Arrange
      let capturedConfig: any = null
      client.defaults.adapter = async (config) => {
        capturedConfig = config
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      // Act: Make a request
      await client.get('/test')

      // Assert: Verify _correlationId is set on the config
      expect(capturedConfig).toBeTruthy()
      expect(capturedConfig._correlationId).toBeTruthy()
      expect(typeof capturedConfig._correlationId).toBe('string')
      expect(capturedConfig._correlationId).toBe(
        capturedConfig.headers['X-Correlation-ID']
      )
    })

    it('should generate a unique correlation ID for each request', async () => {
      // Arrange
      const correlationIds: string[] = []
      client.defaults.adapter = async (config) => {
        correlationIds.push(config.headers['X-Correlation-ID'])
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }

      // Act: Make multiple requests
      await client.get('/test1')
      await client.get('/test2')
      await client.get('/test3')

      // Assert: All correlation IDs should be unique
      expect(correlationIds).toHaveLength(3)
      expect(new Set(correlationIds).size).toBe(3)
    })
  })

  describe('Response Interceptor', () => {
    it('should store response x-correlation-id header on response.config._correlationId', async () => {
      // Arrange: Server echoes back a correlation ID
      const serverCorrelationId = 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789'
      client.defaults.adapter = async (config) => {
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {
            'x-correlation-id': serverCorrelationId,
          },
          config,
        }
      }

      // Act: Make a request
      const response = await client.get('/test')

      // Assert: The server's correlation ID should be stored on response.config._correlationId
      expect(response.config._correlationId).toBe(serverCorrelationId)
    })

    it('should preserve the original correlation ID if server does not echo one back', async () => {
      // Arrange: Server does not return x-correlation-id header
      let originalCorrelationId: string | undefined
      client.defaults.adapter = async (config) => {
        originalCorrelationId = config._correlationId
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {}, // No x-correlation-id in response
          config,
        }
      }

      // Act: Make a request
      const response = await client.get('/test')

      // Assert: The original correlation ID should still be on response.config._correlationId
      expect(response.config._correlationId).toBe(originalCorrelationId)
      expect(response.config._correlationId).toBeTruthy()
    })

    it('should store response x-correlation-id on error responses', async () => {
      // Arrange: Server returns an error with correlation ID
      const serverCorrelationId = 'error-123-456-789'
      client.defaults.adapter = async (config) => {
        const error: any = new Error('Request failed')
        error.response = {
          data: { error: 'Something went wrong' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            'x-correlation-id': serverCorrelationId,
          },
          config,
        }
        error.config = config
        throw error
      }

      // Act & Assert: Make a request and catch the error
      try {
        await client.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.response.config._correlationId).toBe(serverCorrelationId)
      }
    })

    it('should preserve original correlation ID on error if server does not echo one', async () => {
      // Arrange: Server returns an error without correlation ID
      let originalCorrelationId: string | undefined
      client.defaults.adapter = async (config) => {
        originalCorrelationId = config._correlationId
        const error: any = new Error('Request failed')
        error.response = {
          data: { error: 'Something went wrong' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {}, // No x-correlation-id in response
          config,
        }
        error.config = config
        throw error
      }

      // Act & Assert: Make a request and catch the error
      try {
        await client.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.response.config._correlationId).toBe(originalCorrelationId)
        expect(error.response.config._correlationId).toBeTruthy()
      }
    })
  })

  describe('Integration', () => {
    it('should work correctly across multiple request-response cycles', async () => {
      // Arrange: Track correlation IDs across multiple requests
      const requestIds: string[] = []
      const responseIds: string[] = []

      client.defaults.adapter = async (config) => {
        requestIds.push(config._correlationId!)
        // Server echoes back a modified correlation ID
        const serverCorrelationId = `server-${config._correlationId}`
        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {
            'x-correlation-id': serverCorrelationId,
          },
          config,
        }
      }

      // Act: Make multiple requests
      const response1 = await client.get('/test1')
      const response2 = await client.get('/test2')
      const response3 = await client.get('/test3')

      responseIds.push(response1.config._correlationId!)
      responseIds.push(response2.config._correlationId!)
      responseIds.push(response3.config._correlationId!)

      // Assert: All IDs should be unique and properly transformed
      expect(requestIds).toHaveLength(3)
      expect(responseIds).toHaveLength(3)
      expect(new Set(requestIds).size).toBe(3)
      expect(new Set(responseIds).size).toBe(3)

      // Each response ID should be the server-modified version
      responseIds.forEach((responseId, index) => {
        expect(responseId).toBe(`server-${requestIds[index]}`)
      })
    })
  })
})
