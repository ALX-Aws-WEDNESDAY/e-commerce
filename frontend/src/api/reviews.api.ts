import { getReviewsStore, persistReviews } from '@/mocks/data/reviews.data'
import type { CreateReviewPayload, Review, UpdateReviewPayload } from '@/types'

export const reviewsApi = {
  list: async (productId: number): Promise<Review[]> => {
    return getReviewsStore().filter((r) => r.product_id === productId)
  },

  create: async (payload: CreateReviewPayload, authorName: string): Promise<Review> => {
    const store = getReviewsStore()
    const duplicate = store.find(
      (r) => r.product_id === payload.product_id && r.author_name === authorName,
    )
    if (duplicate) {
      throw new Error('You have already reviewed this product')
    }
    const newId = store.length > 0 ? Math.max(...store.map((r) => r.id)) + 1 : 1
    const now = new Date().toISOString()
    const review: Review = {
      id: newId,
      product_id: payload.product_id,
      author_name: authorName,
      rating: payload.rating,
      body: payload.body ?? '',
      created_at: now,
      updated_at: now,
    }
    store.push(review)
    persistReviews()
    return review
  },

  update: async (reviewId: number, payload: UpdateReviewPayload): Promise<Review> => {
    const store = getReviewsStore()
    const review = store.find((r) => r.id === reviewId)
    if (!review) {
      throw new Error('Review not found')
    }
    review.rating = payload.rating
    review.body = payload.body ?? review.body
    review.updated_at = new Date().toISOString()
    persistReviews()
    return review
  },
}
