import { getPageMetadata } from '@/../lib/page-metadata';
import CompleteSignupClient from './CompleteSignupClient';

export const metadata = getPageMetadata('/complete-signup');

export default function CompleteSignupPage() {
  return <CompleteSignupClient />;
}
