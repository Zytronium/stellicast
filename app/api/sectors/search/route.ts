import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

const MAX_RESULTS = 8;

type SectorSearchRow = {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
};

// -------- GET: search sectors by name/slug prefix --------
// Backs the add-sector autocomplete on the manage-video screen. Matches
// on the start of name/slug (prefix search) rather than a substring
// search, so it can lean on a plain btree index instead of needing
// pg_trgm, since the sectors table can scale into the millions.
export async function GET(request: NextRequest) {
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (!q) {
        return NextResponse.json({ sectors: [] });
    }

    const pattern = `${q}%`;

    const [nameResult, slugResult] = await Promise.all([
        supabase
            .from('sectors')
            .select('id, name, slug, icon')
            .ilike('name', pattern)
            .order('name')
            .limit(MAX_RESULTS),
        supabase
            .from('sectors')
            .select('id, name, slug, icon')
            .ilike('slug', pattern)
            .order('slug')
            .limit(MAX_RESULTS),
    ]);

    if (nameResult.error || slugResult.error) {
        const message = nameResult.error?.message ?? slugResult.error?.message ?? 'Search failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }

    // -------- dedupe --------
    // A sector can match both the name and slug query, so merge by id
    // and cap at MAX_RESULTS.
    const seen = new Set<string>();
    const sectors: SectorSearchRow[] = [];

    for (const row of [...(nameResult.data ?? []), ...(slugResult.data ?? [])]) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        sectors.push(row);
        if (sectors.length >= MAX_RESULTS) break;
    }

    return NextResponse.json({ sectors });
}
