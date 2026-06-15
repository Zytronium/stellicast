import { getPageMetadata } from '@/../lib/page-metadata';
import AuthClient from './AuthClient';

export const metadata = getPageMetadata('/auth');

export default function AuthPage() {
  return <AuthClient />;
}
