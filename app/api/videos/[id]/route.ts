import { NextResponse } from 'next/server';
import { videos } from '../route';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const video = videos.find((v) => v.id === id);
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json(video);
}
