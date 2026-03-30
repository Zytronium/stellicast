'use client';
import { useRouter } from 'next/navigation';
import StarMapCore from '@/components/StarMapCore';

export default function StarMapPage() {
    const router = useRouter();
    return (
        <div className="fixed inset-0 overflow-hidden">
            <StarMapCore
                mode="view"
                onNavigate={(slug) => router.push(`/s/${slug}`)}
            />
        </div>
    );
}
