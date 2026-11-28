const { Storage } = require('@google-cloud/storage');

const bucketName = process.env.GCS_GALLERY_BUCKET;

function createStorageClient() {
  if (process.env.GCS_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GCS_CREDENTIALS_JSON);
    return new Storage({
      projectId: credentials.project_id || process.env.GCS_PROJECT_ID,
      credentials,
    });
  }
  return new Storage({ projectId: process.env.GCS_PROJECT_ID });
}

const storage = createStorageClient();

function computeExpiresAt(retentionMonths, startDate = new Date()) {
  const months = Number(retentionMonths) === 6 ? 6 : 3;
  const expiry = new Date(startDate);
  expiry.setMonth(expiry.getMonth() + months);
  return expiry;
}

async function getSignedReadUrl(objectKey, expiresInMs = 30 * 60 * 1000) {
  const [url] = await storage
    .bucket(bucketName)
    .file(objectKey)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMs,
    });
  return url;
}

async function getSignedUploadUrl(
  objectKey,
  contentType,
  expiresInMs = 15 * 60 * 1000,
) {
  const [url] = await storage
    .bucket(bucketName)
    .file(objectKey)
    .getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresInMs,
      contentType,
    });
  return url;
}

module.exports = {
  storage,
  computeExpiresAt,
  getSignedReadUrl,
  getSignedUploadUrl,
};
