import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/account',
        '/settings',
        '/profile',
        '/complete-signup',
        '/consent',
        '/offline',
      ],
    },
    sitemap: 'https://stellicast.com/sitemap.xml',
  }
}