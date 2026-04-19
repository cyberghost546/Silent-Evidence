import { NextResponse } from 'next/server';

// This file proves to Android that silent-evidence.vercel.app owns the TWA app.
// The sha256_cert_fingerprints value comes from PWABuilder after you generate the APK.
// Replace the placeholder fingerprint below with the real one from PWABuilder.
export async function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        // Replace with your actual Android package name from PWABuilder
        package_name: 'com.silentevidence.app',
        // Replace with your SHA-256 fingerprint from PWABuilder → Android → Package details
        sha256_cert_fingerprints: ['REPLACE_WITH_SHA256_FROM_PWABUILDER'],
      },
    },
  ]);
}
