import { http, HttpResponse } from 'msw'
import { reviewsApi } from '@/api/reviews.api'

export const reviewsHandlers = [
  http.get('/api/reviews/', ({ request }) => {
    const url = new URL(request.url)
    const productId = Number(url.searchParams.get('product_id'))
    const reviews = reviewsApi.list(productId)
    return HttpResponse.json(reviews)
  }),

  http.post('/api/reviews/', async ({ request }) => {
    const body = (await request.json()) as {
      product_id: number
      rating: number
      body?: string
      author_name: string
    }
    const { author_name, ...payload } = body
    try {
      const review = reviewsApi.create(payload, author_name)
      return HttpResponse.json(review, { status: 201 })
    } catch (err) {
      return HttpResponse.json({ detail: (err as Error).message }, { status: 400 })
    }
  }),

  http.patch('/api/reviews/:id/', async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as { rating: number; body?: string }
    try {
      const review = reviewsApi.update(id, body)
      return HttpResponse.json(review)
    } catch (err) {
      return HttpResponse.json({ detail: (err as Error).message }, { status: 404 })
    }
  }),
]
