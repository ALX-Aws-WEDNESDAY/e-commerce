import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewsApi } from '@/api/reviews.api'
import toast from 'react-hot-toast'
import type { CreateReviewPayload, UpdateReviewPayload } from '@/types'

export const reviewKeys = {
  all: ['reviews'] as const,
  list: (productId: number) => [...reviewKeys.all, 'list', productId] as const,
}

export function useReviews(productId: number) {
  return useQuery({
    queryKey: reviewKeys.list(productId),
    queryFn: () => reviewsApi.list(productId),
    enabled: productId > 0,
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload, authorName }: { payload: CreateReviewPayload; authorName: string }) =>
      reviewsApi.create(payload, authorName),
    onSuccess: (_data, { payload }) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.list(payload.product_id) })
      toast.success('Review submitted!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: number; payload: UpdateReviewPayload; productId: number }) =>
      reviewsApi.update(reviewId, payload),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.list(productId) })
      toast.success('Review updated!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
