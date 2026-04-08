import React, { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'
import type { Order } from '@/types'

export const OrderSuccessPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const newOrder = location.state?.newOrder as Order | undefined

  useEffect(() => {
    if (!newOrder) {
      navigate('/products')
    }
  }, [newOrder, navigate])

  if (!newOrder) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="flex justify-center mb-6">
        <CheckCircle2 className="h-20 w-20 text-brand-500" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">Order Placed Successfully!</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 transition-colors">
        Thank you for your purchase. Your order <span className="font-semibold px-2 py-1 bg-gray-100 dark:bg-secondary-800 text-gray-900 dark:text-white rounded transition-colors">#{newOrder.reference}</span> is confirmed.
      </p>
      
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-transparent dark:border-secondary-700 p-6 mb-8 text-left transition-colors">
        <h2 className="font-semibold text-lg mb-4 border-b dark:border-secondary-700 pb-2 text-gray-900 dark:text-white transition-colors">Order Summary</h2>
        <div className="space-y-2 text-gray-600 dark:text-gray-300 mb-4 transition-colors">
          <p><strong className="text-gray-900 dark:text-white transition-colors">Shipping to:</strong> {newOrder.shipping_address.full_name}</p>
          <p><strong className="text-gray-900 dark:text-white transition-colors">Address:</strong> {newOrder.shipping_address.address_line_1}, {newOrder.shipping_address.city}</p>
        </div>
        <div className="flex justify-between font-bold text-gray-900 dark:text-white text-lg border-t dark:border-secondary-700 pt-4 transition-colors">
          <span>Amount Paid:</span>
          <span className="text-brand-600 dark:text-brand-400 transition-colors">KES {newOrder.total}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3 w-full max-w-sm mx-auto sm:max-w-none">
        <Link to="/products" className="w-full sm:w-auto">
          <Button variant="secondary" size="lg" className="w-full">Continue Shopping</Button>
        </Link>
        <Link to="/orders" className="w-full sm:w-auto">
          <Button size="lg" className="w-full">View All Orders</Button>
        </Link>
      </div>
    </div>
  )
}
