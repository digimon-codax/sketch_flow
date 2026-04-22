import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const useS3 = process.env.AWS_BUCKET && process.env.AWS_REGION;

// Local storage fallback (multer)
const uploadDir = path.join(process.cwd(), 'uploads');
if (!useS3 && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const localUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// S3 Client
const s3Client = useS3
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

// Use memory storage for S3 uploads so we can pipe to AWS
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadFileStorage = async (file) => {
  if (useS3) {
    const key = `${uuidv4()}-${file.originalname}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );
    return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } else {
    // Local fallback returns relative path (would need static serving in app.js)
    return `/uploads/${file.filename}`;
  }
};

export const deleteFileStorage = async (url) => {
  if (useS3) {
    const key = url.split('.amazonaws.com/')[1];
    if (key) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
        })
      );
    }
  } else {
    // Delete local file
    const filename = url.replace('/uploads/', '');
    const filepath = path.join(uploadDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
};
