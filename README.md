# Elites E-Commerce Platform

A robust, full-stack Serverless E-commerce Application built with React/TypeScript on the Frontend and Django REST Framework on the Backend.

## Recent Upgrades (March 2026)

### Frontend UI/UX Enhancements

- **Dark Mode Support**: Systematically injected adaptive Dark Mode Tailwind classes across the `AccountProfile`, `OrderCard`, and `OrderSuccess` components, ensuring stunning contrast across all pages.
- **Responsive Layout Optimization**: Revamped image grid aspect ratios (`aspect-[4/3]`) and max-height constraints (`max-h-[50vh]`) across `HomePage`, `ProductsPage`, and `ProductDetailPage` to ensure product thumbnails scale beautifully on mobile and tablet displays.
- **Guest Cart Persistence**: Implemented robust `localStorage` memory for carts to prevent users from losing their items when dynamically switching between views seamlessly.

### Authentication & Backend Updates

- **JWT Token Payload Expansion**: Overhauled the authentication token payload logic in the Django back-end so that JWTs now natively carry User `id` and `roles`.
- **Axios HTTP Interceptor**: Rewrote `client.ts` to automatically inject the Bearer token into headers across all authenticated requests, fixing infinite redirect loops.
- **Logout Logic**: Re-factored the logout invalidation sequence on the backend to cleanly revoke active sessions.
- **Robust Error Handling**: Added dynamic display loops on `RegisterForm` to visually render explicit error details (e.g. Password mismatches, complexity issues) directly from Django REST Framework responses.
