import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION || "us-east-1";

const s3Client = new S3Client({
  region,
});

export async function uploadArquivoS3({ key, body, contentType }) {
  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error("S3_BUCKET_NAME não configurado.");
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    bucket,
    key,
    contentType,
    s3Uri: `s3://${bucket}/${key}`,
  };
}
