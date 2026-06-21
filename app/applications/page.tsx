import type { Metadata } from 'next';
import ApplicationsClient from './ApplicationsClient';

export const metadata: Metadata = {
    title: 'Your Applications | Stellicast',
};

export default function ApplicationsPage() {
    return <ApplicationsClient />;
}
