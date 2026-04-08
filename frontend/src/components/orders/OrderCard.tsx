import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Order, OrderStatus } from '@/types'



const statusText: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

interface OrderCardProps {
  order: Order
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-transparent dark:border-secondary-700 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
            Order #{order.reference}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Badge variant={order.status as any}>
          {statusText[order.status]}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 transition-colors">Items</h4>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b dark:border-secondary-700 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white transition-colors">{item.product.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                    Qty: {item.quantity} × KES {item.price}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white transition-colors">KES {item.subtotal}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2 transition-colors">Shipping Address</h4>
          <div className="bg-gray-50 dark:bg-secondary-900 p-3 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors">
            <p className="font-medium text-gray-900 dark:text-white transition-colors">{order.shipping_address.full_name}</p>
            <p>{order.shipping_address.phone}</p>
            <p>{order.shipping_address.address_line_1}</p>
            {order.shipping_address.address_line_2 && (
              <p>{order.shipping_address.address_line_2}</p>
            )}
            <p>
              {order.shipping_address.city}, {order.shipping_address.county}
            </p>
          </div>
        </div>

        <div className="border-t dark:border-secondary-700 pt-4 transition-colors">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700 dark:text-gray-300 transition-colors">
              <span>Subtotal:</span>
              <span>KES {order.total}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg text-gray-900 dark:text-white transition-colors">
              <span>Total:</span>
              <span className="text-brand-600 dark:text-brand-400 transition-colors">KES {order.total}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t dark:border-secondary-700 transition-colors">
          <Link to={`/products`} className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          
          {order.status === 'delivered' && (
            <Button size="sm" className="w-full sm:w-auto">
              Buy Again
            </Button>
          )}
          
          {['pending', 'confirmed'].includes(order.status) && (
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full sm:w-auto text-red-600 hover:text-red-700"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
