import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { useSubmitReview, useUpdateReview } from '@/hooks/useReviews'
import { useAuthStore } from '@/store/auth.store'
import type { Review } from '@/types'

interface ReviewFormProps {
  productId: number
  existingReview?: Review
}

export function ReviewForm({ productId, existingReview }: ReviewFormProps) {
  const user = useAuthStore((s) => s.user)

  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [body, setBody] = useState(existingReview?.body ?? '')
  const [hovered, setHovered] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const submitReview = useSubmitReview()
  const updateReview = useUpdateReview()

  const mutation = existingReview ? updateReview : submitReview
  const isPending = mutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Please select a star rating')
      return
    }

    setError(null)

    if (existingReview) {
      updateReview.mutate(
        { reviewId: existingReview.id, payload: { rating, body }, productId },
        {
          onSuccess: () => {
            setRating(0)
            setBody('')
            setError(null)
          },
          onError: (err: Error) => setError(err.message),
        }
      )
    } else {
      const authorName = user ? `${user.first_name} ${user.last_name}` : ''
      submitReview.mutate(
        { payload: { product_id: productId, rating, body }, authorName },
        {
          onSuccess: () => {
            setRating(0)
            setBody('')
            setError(null)
          },
          onError: (err: Error) => setError(err.message),
        }
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((index) => {
            const filled = index <= rating || index <= hovered
            return (
              <button
                key={index}
                type="button"
                onClick={() => setRating(index)}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(0)}
                className="p-0.5 focus:outline-none"
                aria-label={`Rate ${index} star${index > 1 ? 's' : ''}`}
              >
                <Star
                  className={cn(
                    'h-7 w-7 transition-colors',
                    filled
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-transparent text-gray-300'
                  )}
                />
              </button>
            )
          })}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>

      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Share your thoughts (optional)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400 text-right">{body.length}/1000</p>
      </div>

      <Button
        type="submit"
        disabled={isPending || rating === 0}
        className="flex items-center gap-2"
      >
        {isPending && <Spinner size="sm" className="mr-0" />}
        {existingReview ? 'Update Review' : 'Submit Review'}
      </Button>
    </form>
  )
}
