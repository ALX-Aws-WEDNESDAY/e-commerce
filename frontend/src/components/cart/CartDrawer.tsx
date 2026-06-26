import React from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useCart, useUpdateCartItem, useRemoveCartItem } from '@/hooks/useCart'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/utils/formatPrice'
import { listItem } from '@/lib/animations'

const FREE_DELIVERY_THRESHOLD = 2000

export const CartDrawer: React.FC = () => {
  const { isOpen, closeCart } = useCartStore()
  const { data: cart, isLoading } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()

  const total = parseFloat(cart?.total ?? '0')
  const remaining = FREE_DELIVERY_THRESHOLD - total
  const freeDeliveryProgress = Math.min((total / FREE_DELIVERY_THRESHOLD) * 100, 100)

  const handleUpdateQuantity = (itemId: number, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change
    if (newQuantity < 1) return
    updateItem.mutate({ itemId, quantity: newQuantity })
  }

  const handleRemove = (itemId: number) => {
    removeItem.mutate(itemId)
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Shopping Cart
            {cart && cart.item_count > 0 && (
              <span className="ml-auto text-xs font-medium text-muted-foreground">
                {cart.item_count} {cart.item_count === 1 ? 'item' : 'items'}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Free delivery progress */}
        {cart && cart.item_count > 0 && (
          <div className="px-6 py-3 bg-muted/50 border-b">
            {remaining > 0 ? (
              <p className="text-xs text-muted-foreground mb-1.5">
                Add{' '}
                <span className="font-semibold text-foreground">
                  {formatPrice(remaining.toString())}
                </span>{' '}
                more for free delivery
              </p>
            ) : (
              <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                <Truck className="h-3 w-3" /> You've unlocked free delivery!
              </p>
            )}
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${freeDeliveryProgress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !cart || cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <ShoppingBag className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Your cart is empty</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Browse our collection and add something you love.
                </p>
                <Button variant="outline" size="sm" onClick={closeCart} asChild>
                  <Link to="/products">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="flex items-start gap-3 py-4 border-b last:border-b-0"
                  >
                    <Link to={`/products/${item.product.id}`} onClick={closeCart} className="shrink-0">
                      <img
                        src={item.product.images[0]?.url}
                        alt={item.product.name}
                        className="h-16 w-16 rounded-xl object-cover border bg-muted"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.product.id}`}
                        onClick={closeCart}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm font-semibold text-primary mt-1">
                        {formatPrice(item.subtotal)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {/* Qty stepper */}
                        <div className="flex items-center rounded-lg border bg-background">
                          <button
                            className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                            disabled={updateItem.isPending || item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <motion.span
                            key={item.quantity}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-7 text-center text-sm font-medium"
                          >
                            {item.quantity}
                          </motion.span>
                          <button
                            className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                            disabled={updateItem.isPending}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removeItem.isPending}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t bg-background px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery</span>
                <span className={total >= FREE_DELIVERY_THRESHOLD ? 'text-primary font-medium' : ''}>
                  {total >= FREE_DELIVERY_THRESHOLD ? 'Free' : formatPrice('200')}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary text-lg">
                  {formatPrice(
                    (total + (total >= FREE_DELIVERY_THRESHOLD ? 0 : 200)).toString()
                  )}
                </span>
              </div>
            </div>
            <Link to="/checkout" onClick={closeCart}>
              <Button className="w-full gap-2" size="lg">
                Checkout <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" className="w-full text-sm" onClick={closeCart}>
              Continue Shopping
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
