import { MDXRemote } from 'next-mdx-remote/rsc';
import fs from 'fs';
import path from 'path';

export default async function PrivacyPolicy() {
  const filePath = path.join(process.cwd(), 'content', 'privacy-policy.md');
  const markdown = fs.readFileSync(filePath, 'utf-8');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="prose [body:not(.light)_&]:prose-invert lg:prose-lg max-w-none">
        <MDXRemote source={markdown} />
      </article>
    </div>
  );
}
