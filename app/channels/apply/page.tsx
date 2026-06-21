import EarlyAccessApplicationClient from './EarlyAccessApplicationClient';
import { getPageMetadata } from '@/../lib/page-metadata';
export const metadata = getPageMetadata('/channels/apply');

export default function ChannelsApplyPage() {
    return <EarlyAccessApplicationClient />;
}
