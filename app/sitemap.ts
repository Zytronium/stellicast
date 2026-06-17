import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/../lib/supabase-server'

const BASE = 'https://stellicast.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createSupabaseServerClient()

    // -------- Dynamic routes --------

    const [{ data: sectors }, { data: videos }, { data: channels }] = await Promise.all([
        supabase
            .from('sectors')
            .select('slug, updated_at')
            .eq('private_access', false),
        supabase
            .from('videos')
            .select('slug, updated_at')
            .eq('visibility', 'public'),
        supabase
            .from('channels')
            .select('handle, updated_at'),
    ])

    // -------- Static routes --------

    const staticRoutes: MetadataRoute.Sitemap = [
        // Core
        { url: `${BASE}`,            lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
        { url: `${BASE}/explore`,    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
        { url: `${BASE}/sectors`,    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${BASE}/s/all`,      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
        { url: `${BASE}/star-map`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
        // Info
        { url: `${BASE}/about`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE}/rules`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        // Actions
        { url: `${BASE}/upload`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE}/new-sector`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: `${BASE}/auth`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        // Legal
        { url: `${BASE}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${BASE}/terms-of-use`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ]

    // -------- Dynamic route entries --------

    const sectorRoutes: MetadataRoute.Sitemap = (sectors ?? []).map(s => ({
        url: `${BASE}/s/${s.slug}`,
        lastModified: new Date(s.updated_at),
      changeFrequency: 'daily',
      priority: 0.8,
    }))

    const videoRoutes: MetadataRoute.Sitemap = (videos ?? []).map(v => ({
        url: `${BASE}/watch/${v.slug}`,
        lastModified: new Date(v.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
    }))

    const channelRoutes: MetadataRoute.Sitemap = (channels ?? []).map(c => ({
        url: `${BASE}/channel/${c.handle}`,
        lastModified: new Date(c.updated_at),
        changeFrequency: 'weekly',
        priority: 0.6,
    }))

    return [...staticRoutes, ...sectorRoutes, ...videoRoutes, ...channelRoutes]
}
