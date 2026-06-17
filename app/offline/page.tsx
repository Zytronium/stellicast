import { getPageMetadata } from '@/../lib/page-metadata';
import OfflineClient from './OfflineClient';

export const metadata = getPageMetadata('/offline');

export default function OfflinePage() {
  return <OfflineClient />;
}
