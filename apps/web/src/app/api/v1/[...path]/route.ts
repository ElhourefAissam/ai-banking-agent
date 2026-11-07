import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(req, await context.params);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(req, await context.params);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(req, await context.params);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(req, await context.params);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(req, await context.params);
}

async function handleProxy(req: NextRequest, { path }: { path: string[] }) {
  const backendBase =
    process.env.INTERNAL_API_URL ||
    (process.env.NODE_ENV === 'production' ? 'http://api:4001' : 'http://localhost:4001');
  const targetPath = (path || []).join('/');
  const search = req.nextUrl.search || '';
  const targetUrl = `${backendBase}/api/v1/${targetPath}${search}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : await req.arrayBuffer();

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    const resBody = await res.arrayBuffer();

    return new NextResponse(resBody, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed to proxy ${req.method} to ${targetUrl}:`, err.message);
    return NextResponse.json(
      {
        statusCode: 502,
        message: `Failed to connect to backend service at ${targetUrl}: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
