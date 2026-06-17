import { getPageMetadata } from '@/../lib/page-metadata';
import NewSectorClient from './NewSectorClient';

export const metadata = getPageMetadata('/new-sector');

export default function NewSectorPage() {
  return <NewSectorClient />;
}
