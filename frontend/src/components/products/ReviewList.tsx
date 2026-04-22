import React from 'react'
import { useReviews } from '@/hooks/useReviews'
import { Spinner } from '@/components/ui/Spinner'
import { StarRating } from '@/components/ui/StarRating'
import { cn } from '@/utils/cn'

interface ReviewListProps {
  productId: number
}

export const ReviewList: React.FC<ReviewListProps> = ({ productId }) => {
  const { data: reviews = [], isLoading } = useReviews(productId)

  if (isLoading) {
    return <Spinner className="py-8" />
  }

  if (reviews.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-6">
        No reviews yet. Be the first to review this product.
      </p>
    )
  }

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  const averageRounded = Math.round(average * 10) / 10

  return (
    <div className="space-y-6">
      {/* Aggregate summary */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <StarRating rating={averageRounded} size="lg" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {averageRounded} out of 5 ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
        </span>
      </div>

      {/* Review cards */}
      <ul className="space-y-4">
        {reviews.map((review) => (
          <li
            key={review.id}
            className={cn(
              'rounded-lg border border-gray-200 dark:border-gray-700',
              'bg-white dark:bg-gray-800 p-4 space-y-2'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {review.author_name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(review.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <StarRating rating={review.rating} size="sm" />
            {review.body && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {review.body}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
