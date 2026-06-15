import { getPageMetadata } from '@/../lib/page-metadata';
import StarMapClient from './StarMapClient';

export const metadata = getPageMetadata('/star-map');

export default function StarMapPage() {
  return <StarMapClient />;
}
