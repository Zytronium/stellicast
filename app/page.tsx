'use client';

export default function Home() {
    return (
        <div className="p-6">
            <div className="grid grid-cols-4 gap-6 auto-rows-max">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-gray-200 dark:bg-gray-800 rounded-lg aspect-video flex items-center justify-center"
                    >
                        <span className="text-gray-500 dark:text-gray-400">Video {i + 1}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}