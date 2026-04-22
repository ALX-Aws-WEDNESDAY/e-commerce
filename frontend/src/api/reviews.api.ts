import { mockApi } from '@/api/mock.api'
import type { CreateReviewPayload, UpdateReviewPayload } from '@/types'

export const reviewsApi = {
  list: (productId: number) => mockApi.getReviews(productId),

  create: (payload: CreateReviewPayload, authorName: string) =>
    mockApi.createReview(payload, authorName),

  update: (reviewId: number, payload: UpdateReviewPayload) =>
    mockApi.updateReview(reviewId, payload),
}
