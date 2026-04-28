import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import axios, { type AxiosInstance } from 'axios'
import { applyCorrelationIdInterceptor } from './correlationIdInterceptor'

// Feature: frontend-microservice-readiness, Property 1: All requests carry a valid UUID v4 correlation ID
// **Validates: Requirements 7.1, 7.2, 7.5**

describe('correlationIdInterceptor - Property-Based Tests', () => {
  let client: AxiosInstance

  beforeEach(() => {
    // Create a fresh Axios instance for each test
    client = axios.create({
      baseURL: 'http://localhost:3000',
    })
    applyCorrelationIdInterceptor(client)
  })

  it('Property 1: All requests carry a valid UUID v4 correlation ID', () => {
    // UUID v4 regex pattern
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    fc.assert(
      fc.asyncProperty(
        fc.record({
          url: fc.webUrl(),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        }),
        async (requestConfig) => {
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

          // Act: Make a request with arbitrary URL and method
          await client.request({
            url: requestConfig.url,
            method: requestConfig.method,
          })

          // Assert: X-Correlation-ID header SHALL be present
          expect(capturedConfig).toBeTruthy()
          expect(capturedConfig.headers['X-Correlation-ID']).toBeTruthy()

          // Assert: X-Correlation-ID SHALL be a valid UUID v4 string
          const correlationId = capturedConfig.headers['X-Correlation-ID']
          expect(typeof correlationId).toBe('string')
          expect(correlationId).toMatch(uuidV4Regex)

          // Additional validation: ensure it's stored on config._correlationId
          expect(capturedConfig._correlationId).toBe(correlationId)
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: frontend-microservice-readiness, Property 3: Response correlation ID is preserved
  // **Validates: Requirements 7.3**
  it('Property 3: Response correlation ID is preserved', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          url: fc.webUrl(),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          serverCorrelationId: fc.uuid(),
        }),
        async (requestConfig) => {
          // Arrange: Mock the adapter to return a response with x-correlation-id header
          client.defaults.adapter = async (config) => {
            return {
              data: {},
              status: 200,
              statusText: 'OK',
              headers: {
                'x-correlation-id': requestConfig.serverCorrelationId,
              },
              config,
            }
          }

          // Act: Make a request with arbitrary URL and method
          const response = await client.request({
            url: requestConfig.url,
            method: requestConfig.method,
          })

          // Assert: response.config._correlationId SHALL be the server-provided correlation ID
          expect(response.config._correlationId).toBe(
            requestConfig.serverCorrelationId,
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})
