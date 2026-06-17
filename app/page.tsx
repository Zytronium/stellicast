import { getPageMetadata } from '@/../lib/page-metadata';
import HomeClient from './HomeClient';

export const metadata = getPageMetadata('/');

export default function HomePage() {
  return <HomeClient />;
}
