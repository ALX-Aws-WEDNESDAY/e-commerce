import type { Review } from '@/types'

const SEED_REVIEWS: Review[] = [
  {
    id: 1,
    product_id: 1,
    author_name: 'Amina W.',
    rating: 5,
    body: 'Excellent power bank! Charged my phone three times on a single charge during a camping trip.',
    created_at: '2025-03-01T08:30:00Z',
    updated_at: '2025-03-01T08:30:00Z',
  },
  {
    id: 2,
    product_id: 2,
    author_name: 'Brian O.',
    rating: 4,
    body: 'Great earbuds, solid ANC. Battery life is impressive and they fit comfortably for long sessions.',
    created_at: '2025-03-05T14:00:00Z',
    updated_at: '2025-03-05T14:00:00Z',
  },
  {
    id: 3,
    product_id: 3,
    author_name: 'Ciku M.',
    rating: 5,
    body: 'Beautiful dress, true to size. The Ankara print is vibrant and the fabric quality is excellent.',
    created_at: '2025-03-10T11:15:00Z',
    updated_at: '2025-03-10T11:15:00Z',
  },
]

function loadStore(): Review[] {
  try {
    const raw = localStorage.getItem('mock_reviews')
    if (raw) {
      return JSON.parse(raw) as Review[]
    }
  } catch {
    // ignore parse errors, fall back to seed data
  }
  return [...SEED_REVIEWS]
}

const reviewsStore: Review[] = loadStore()

export function getReviewsStore(): Review[] {
  return reviewsStore
}

export function persistReviews(): void {
  localStorage.setItem('mock_reviews', JSON.stringify(reviewsStore))
}
