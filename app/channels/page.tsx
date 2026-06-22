import { getPageMetadata } from '@/../lib/page-metadata';
import ChannelsClient from './ChannelsClient';

export const metadata = getPageMetadata('/channels');

export default function ChannelsPage() {
  return <ChannelsClient />;
}
