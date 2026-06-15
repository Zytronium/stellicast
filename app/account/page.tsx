import { getPageMetadata } from '@/../lib/page-metadata';
import AccountClient from './AccountClient';

export const metadata = getPageMetadata('/account');

export default function AccountPage() {
  return <AccountClient />;
}
