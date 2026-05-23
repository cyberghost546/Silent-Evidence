import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        // Auto-select best format (WebP/AVIF) and compress quality automatically
        transformation: [{ fetch_format: 'auto', quality: 'auto' }],
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

/**
 * optimizeCloudinaryUrl — adds f_auto,q_auto,w_auto to any existing Cloudinary URL.
 * Use this when rendering images that were uploaded without transforms (legacy URLs).
 *
 * Example:
 *   https://res.cloudinary.com/demo/image/upload/sample.jpg
 *   → https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_auto/sample.jpg
 */
export function optimizeCloudinaryUrl(url: string, width?: number): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const transforms = width
    ? `f_auto,q_auto,w_${width}`
    : 'f_auto,q_auto';
  return url.replace('/image/upload/', `/image/upload/${transforms}/`);
}
