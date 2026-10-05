import type { Product } from './types'

// Temporary demo item for the first design test. Replace with real inventory later.
export const products: Product[] = [
  {
    id: 'demo-01',
    name: 'Demo Oversized Hoodie',
    category: 'Худи',
    price: 69,
    description: 'Temporary demo item used to test the YAROPLUGG shopping flow. It will be replaced by your real product tomorrow.',
    composition: 'Demo',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Black', hex: '#111111' }],
    images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=90'],
    featured: true,
  },
]
