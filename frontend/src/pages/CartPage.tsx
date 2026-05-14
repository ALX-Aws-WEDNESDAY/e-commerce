import React from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/utils/formatPrice'
import { staggerContainer, listItem, fadeUp } from '@/lib/animations'

const FREE_DELIVERY_THRESHOLD = 2000

export const CartPage: React.FC = () => {
  const { data: cart, isLoading } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()

  const handleUpdateQuantity = (itemId: number, currentQty: number, change: number) => {
    const newQty = currentQty + change
    if (newQty < 1) return
    updateItem.mutate({ itemId, quantity: newQty })
  }

  const total = parseFloat(cart?.total ?? '0')
  const shipping = total >= FREE_DELIVERY_THRESHOLD ? 0 : 200

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-2xl">
                <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-3xl font-bold font-display mb-8"
        >
          Shopping Cart
        </motion.h1>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <ShoppingBag className="h-9 w-9 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Browse our collection and add something you love.
          </p>
          <Link to="/products">
            <Button size="lg" className="gap-2">
              Start Shopping <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.h1
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-3xl font-bold font-display mb-8"
      >
        Shopping Cart
        <span className="text-lg font-normal text-muted-foreground ml-2">
          ({cart.item_count} {cart.item_count === 1 ? 'item' : 'items'})
        </span>
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2">
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence initial={false}>
              {cart.items.map((item) => (
                <motion.div
                  key={item.id}
                  variants={listItem}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                  layout
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-4">
                      <Link to={`/products/${item.product.id}`} className="shrink-0">
                        <img
                          src={item.product.images[0]?.url}
                          alt={item.product.name}
                          className="h-20 w-20 rounded-xl object-cover border bg-muted"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.product.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-primary font-bold mt-1">
                          {formatPrice(item.product.price)}
                        </p>

                        <div className="flex items-center gap-3 mt-3">
                          {/* Qty stepper */}
                          <div className="flex items-center rounded-xl border overflow-hidden">
                            <button
                              className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                              disabled={updateItem.isPending || item.quantity <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <motion.span
                              key={item.quantity}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="w-8 text-center text-sm font-semibold"
                            >
                              {item.quantity}
                            </motion.span>
                            <button
                              className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                              disabled={updateItem.isPending}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem.mutate(item.id)}
                            disabled={removeItem.isPending}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-foreground">
                          {formatPrice(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-5">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({cart.item_count} items)</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span className={shipping === 0 ? 'text-primary font-medium' : ''}>
                    {shipping === 0 ? 'Free' : formatPrice(shipping.toString())}
                  </span>
                </div>
              </div>

              {/* Free delivery progress */}
              {total < FREE_DELIVERY_THRESHOLD && (
                <div className="my-4 p-3 bg-muted rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Truck className="h-3.5 w-3.5" />
                    <span>
                      Add{' '}
                      <span className="font-semibold text-foreground">
                        {formatPrice((FREE_DELIVERY_THRESHOLD - total).toString())}
                      </span>{' '}
                      for free delivery
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(total / FREE_DELIVERY_THRESHOLD) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div className="flex justify-between font-semibold text-base mb-5">
                <span>Total</span>
                <span className="text-primary text-lg">
                  {formatPrice((total + shipping).toString())}
                </span>
              </div>

              <div className="space-y-2.5">
                <Link to="/checkout">
                  <Button className="w-full gap-2" size="lg">
                    Checkout <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/products">
                  <Button variant="ghost" className="w-full text-sm">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
