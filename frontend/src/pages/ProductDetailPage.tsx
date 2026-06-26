import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Heart,
  MapPin,
  Star,
  ChevronRight,
  Plus,
  Minus,
  Package,
  ArrowLeft,
} from 'lucide-react'
import { useProduct } from '@/hooks/useProducts'
import { useAddToCart } from '@/hooks/useCart'
import { useReviews } from '@/hooks/useReviews'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ReviewList } from '@/components/products/ReviewList'
import { ReviewForm } from '@/components/products/ReviewForm'
import { formatPrice, formatDiscount } from '@/utils/formatPrice'
import { staggerContainer, fadeUp, slideFromRight } from '@/lib/animations'

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const productId = parseInt(id || '0', 10)

  const { data: product, isLoading, error } = useProduct(productId)
  const addToCart = useAddToCart()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const { data: reviews = [] } = useReviews(product?.id ?? 0)

  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)

  const userExistingReview = user
    ? reviews.find((r) => r.author_name === `${user.first_name} ${user.last_name}`)
    : undefined

  const handleAddToCart = () => {
    if (!product) return
    addToCart.mutate({ productId: product.id, quantity })
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-3">
            <Skeleton className="w-full aspect-square rounded-2xl" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <p className="text-muted-foreground mb-5 text-sm">
          This product may no longer be available.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go back
        </Button>
      </div>
    )
  }

  const images = product.images.length > 0
    ? product.images
    : [{ id: 1, url: `https://picsum.photos/seed/${product.id}/600/600`, is_primary: true }]

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <motion.nav
          className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-foreground transition-colors">Products</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </motion.nav>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left: images */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {/* Main image */}
            <div className="relative overflow-hidden rounded-2xl bg-muted aspect-square">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={images[activeImage]?.url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                />
              </AnimatePresence>
              {!product.in_stock && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground bg-background border rounded-full px-4 py-1.5">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === activeImage
                        ? 'border-primary shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: info */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-5"
          >
            {/* Sale badge */}
            {product.original_price && (
              <motion.div variants={fadeUp}>
                <span className="text-xs font-bold bg-amber-500 text-white px-3 py-1 rounded-full">
                  -{formatDiscount(product.original_price, product.price)}% OFF
                </span>
              </motion.div>
            )}

            {/* Name */}
            <motion.h1
              variants={fadeUp}
              className="text-2xl md:text-3xl font-bold text-foreground font-display leading-tight"
            >
              {product.name}
            </motion.h1>

            {/* Rating & location */}
            <motion.div variants={fadeUp} className="flex items-center gap-4 flex-wrap">
              {product.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= Math.round(product.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-border'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({product.review_count} {product.review_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
              {product.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {product.location}
                </div>
              )}
            </motion.div>

            {/* Price */}
            <motion.div variants={fadeUp} className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.original_price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.original_price)}
                </span>
              )}
            </motion.div>

            {/* Stock status */}
            <motion.div variants={fadeUp}>
              {product.in_stock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  In Stock
                </span>
              ) : (
                <span className="text-sm font-medium text-destructive">Out of Stock</span>
              )}
            </motion.div>

            {/* Description */}
            <motion.div variants={fadeUp}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </motion.div>

            <Separator />

            {/* Qty stepper */}
            {product.in_stock && (
              <motion.div variants={fadeUp} className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity</span>
                <div className="flex items-center rounded-xl border overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <motion.span
                    key={quantity}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-10 text-center text-sm font-semibold"
                  >
                    {quantity}
                  </motion.span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 gap-2 hidden sm:flex"
                disabled={!product.in_stock || addToCart.isPending}
                onClick={handleAddToCart}
              >
                {addToCart.isPending ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                      className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </Button>
              <button
                onClick={() => setWishlisted((w) => !w)}
                className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${
                  wishlisted
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-border hover:border-red-200 hover:text-red-500 text-muted-foreground'
                }`}
              >
                <motion.div animate={wishlisted ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                  <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500' : ''}`} />
                </motion.div>
              </button>
            </motion.div>

            {/* Seller card */}
            {product.seller && (
              <motion.div variants={fadeUp}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {product.seller[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{product.seller}</p>
                      {product.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {product.location}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Reviews section */}
        <motion.div
          className="mt-16"
          variants={slideFromRight}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <h2 className="text-2xl font-bold font-display mb-6">
            Reviews
            {reviews.length > 0 && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                ({reviews.length})
              </span>
            )}
          </h2>
          <ReviewList productId={product.id} />
          <div className="mt-8">
            {isAuthenticated ? (
              <>
                <h3 className="text-lg font-semibold mb-4">
                  {userExistingReview ? 'Update Your Review' : 'Leave a Review'}
                </h3>
                <ReviewForm productId={product.id} existingReview={userExistingReview} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>{' '}
                to leave a review
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-sm border-t px-4 py-3 z-30">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-bold text-primary">{formatPrice(product.price)}</p>
          </div>
          <Button
            className="flex-1 gap-2"
            disabled={!product.in_stock || addToCart.isPending}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
            {addToCart.isPending ? 'Adding...' : product.in_stock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </div>
    </>
  )
}
