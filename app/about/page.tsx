import { getPageMetadata } from '@/../lib/page-metadata';
import AboutClient from './AboutClient';

export const metadata = getPageMetadata('/about');

export default function AboutPage() {
  return <AboutClient />;
}
