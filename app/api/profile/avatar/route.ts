// ============================================================
//  app/api/profile/avatar/route.ts
//
//  POST /api/profile/avatar
//
//  Receives a multipart form-data file upload, validates it,
//  saves it to disk, and returns the public URL so the client
//  can store it in the user's profile.
//
//  Saved location: public/uploads/avatars/<userId>-<timestamp>.<ext>
//  Public URL:     /uploads/avatars/<userId>-<timestamp>.<ext>
//
//  Validation:
//    - Caller must be logged in
//    - File must be provided in the "file" form field
//    - File type must be JPEG, PNG, WebP, or GIF
//    - File size must be under 5 MB
//
//  Note: this endpoint does NOT update the Profile row — the client
//  receives the URL and then sends it to PATCH /api/profile to save it.
// ============================================================

// Import NextResponse so we can return JSON HTTP responses
import { NextResponse } from 'next/server';

// Import the cookies helper to read the session cookie
import { cookies } from 'next/headers';

// Import Node.js file system helpers for writing files and creating directories
import { writeFile, mkdir } from 'fs/promises';

// Import the path utility to safely build file system paths (handles OS differences)
import { join } from 'path';

// Maximum allowed file size: 5 megabytes, expressed in bytes.
// 5 * 1024 * 1024 = 5,242,880 bytes.
const MAX_SIZE = 5 * 1024 * 1024;

// Allowed MIME types — only common web image formats are accepted.
// Animated GIF is included for fun profile pictures.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ── POST handler ──────────────────────────────────────────────────────────────
// Receives the uploaded image and saves it to the public directory.
export async function POST(req: Request) {
  // Read all cookies from the request
  const cookieStore = await cookies();

  // Extract the logged-in user's ID — only logged-in users can upload avatars
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  // Guests cannot upload avatars
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  // Parse the incoming multipart/form-data upload.
  // req.formData() reads the entire body and extracts all form fields.
  const formData = await req.formData();

  // Read the uploaded file from the "file" field.
  // formData.get('file') returns the file or null if the field wasn't included.
  // "as File | null" tells TypeScript what type to expect.
  const file = formData.get('file') as File | null;

  // No file was included in the form submission
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  // Validate the file's MIME type.
  // file.type is set by the browser based on the file extension and magic bytes.
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP and GIF images are allowed.' }, { status: 400 });
  }

  // Validate the file size in bytes.
  // file.size is the raw byte count of the uploaded file.
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image must be smaller than 5 MB.' }, { status: 400 });
  }

  // Convert the browser File object to a Node.js Buffer so we can write it to disk.
  // file.arrayBuffer() returns a raw binary ArrayBuffer.
  // Buffer.from() wraps it in a Node.js Buffer that writeFile() understands.
  const buffer = Buffer.from(await file.arrayBuffer());

  // Determine the file extension from the MIME type.
  // "image/jpeg".split('/')[1] → "jpeg"; .replace('jpeg', 'jpg') normalises to "jpg"
  // so files are saved as .jpg not .jpeg.
  const ext      = file.type.split('/')[1].replace('jpeg', 'jpg');

  // Build a unique filename using the user's ID and the current timestamp.
  // e.g. "42-1711234567890.png"
  // This prevents filename collisions when the same user uploads multiple avatars.
  const filename = `${userId}-${Date.now()}.${ext}`;

  // Build the absolute file system path to the upload directory.
  // process.cwd() is the project root; public/uploads/avatars/ is served statically.
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');

  // Create the directory if it doesn't exist.
  // { recursive: true } means mkdir won't throw if the directory already exists.
  await mkdir(uploadDir, { recursive: true });

  // Write the file buffer to disk at the constructed path
  await writeFile(join(uploadDir, filename), buffer);

  // Build the public URL — Next.js automatically serves files in /public at the root path.
  // So public/uploads/avatars/42-123.png becomes accessible at /uploads/avatars/42-123.png
  const url = `/uploads/avatars/${filename}`;

  // Return the public URL so the client can save it to the profile
  return NextResponse.json({ url });
}
