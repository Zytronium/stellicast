import { getPageMetadata } from '@/../lib/page-metadata';
import UploadClient from './UploadClient';

export const metadata = getPageMetadata('/upload');

export default function UploadPage() {
  return <UploadClient />;
}
