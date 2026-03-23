import React from 'react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'

export const AccountProfile: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const { clearUser } = useAuthStore()

  const handleLogout = () => {
    clearUser()
    window.location.href = '/'
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please login to view your account.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-transparent dark:border-secondary-700 p-6 transition-colors">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-secondary-900 border border-gray-300 dark:border-secondary-700 text-gray-900 dark:text-white rounded-md transition-colors">
              {user.first_name}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-secondary-900 border border-gray-300 dark:border-secondary-700 text-gray-900 dark:text-white rounded-md transition-colors">
              {user.last_name}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address
          </label>
          <div className="w-full px-3 py-2 bg-gray-50 dark:bg-secondary-900 border border-gray-300 dark:border-secondary-700 text-gray-900 dark:text-white rounded-md transition-colors">
            {user.email}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Member Since
          </label>
          <div className="w-full px-3 py-2 bg-gray-50 dark:bg-secondary-900 border border-gray-300 dark:border-secondary-700 text-gray-900 dark:text-white rounded-md transition-colors">
            {new Date(user.date_joined).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <div className="flex justify-between items-center">
          <Button variant="secondary">
            Edit Profile
          </Button>
          
          <Button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
