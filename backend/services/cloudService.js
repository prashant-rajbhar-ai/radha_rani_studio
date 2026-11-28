const crypto = require('crypto');

const PROVIDER = String(process.env.MEDIA_STORAGE_PROVIDER || 'gcs').toLowerCase();

let gcsBucket = null;
let azureContainerClient = null;

function getGcsBucket() {
  if (gcsBucket) return gcsBucket;
  const { Storage } = require('@google-cloud/storage');
  const bucketName = process.env.GCS_MEDIA_BUCKET;
  if (!bucketName) {
    throw new Error('Missing GCS_MEDIA_BUCKET environment variable.');
  }
  const storage = process.env.GCS_KEY_JSON
    ? new Storage({ credentials: JSON.parse(process.env.GCS_KEY_JSON) })
    : new Storage();
  gcsBucket = storage.bucket(bucketName);
  return gcsBucket;
}

function getAzureContainer() {
  if (azureContainerClient) return azureContainerClient;
  const { BlobServiceClient } = require('@azure/storage-blob');
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_MEDIA_CONTAINER || 'client-galleries';
  if (!connStr) {
    throw new Error('Missing AZURE_STORAGE_CONNECTION_STRING environment variable.');
  }
  const serviceClient = BlobServiceClient.fromConnectionString(connStr);
  azureContainerClient = serviceClient.getContainerClient(containerName);
  return azureContainerClient;
}

function buildObjectKey({ galleryId, originalName = 'media', mediaType = 'image' }) {
  const ext = String(originalName).split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') ||
    (mediaType === 'video' ? 'mp4' : 'jpg');
  const id = crypto.randomBytes(8).toString('hex');
  return `galleries/${galleryId}/${mediaType}s/${Date.now()}-${id}.${ext.toLowerCase()}`;
}

async function createUploadUrl({ objectKey, contentType }) {
  if (PROVIDER === 'azure') {
    const { BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } =
      require('@azure/storage-blob');
    const container = getAzureContainer();
    const blobClient = container.getBlobClient(objectKey);
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);

    // For Account/SharedKey connection strings, extract accountName & accountKey
    const accountMatch = process.env.AZURE_STORAGE_CONNECTION_STRING.match(/AccountName=([^;]+)/i);
    const keyMatch = process.env.AZURE_STORAGE_CONNECTION_STRING.match(/AccountKey=([^;]+)/i);
    if (!accountMatch || !keyMatch) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING must include AccountName and AccountKey for SAS signing.');
    }
    const sharedKeyCredential = new StorageSharedKeyCredential(accountMatch[1], keyMatch[1]);
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName: objectKey,
        permissions: BlobSASPermissions.parse('cw'),
        expiresOn,
        contentType,
      },
      sharedKeyCredential,
    ).toString();

    return {
      provider: 'azure',
      uploadUrl: `${blobClient.url}?${sasToken}`,
      publicUrl: blobClient.url,
      method: 'PUT',
      headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
    };
  }

  // Default: Google Cloud Storage V4 signed upload URL
  const bucket = getGcsBucket();
  const file = bucket.file(objectKey);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  return {
    provider: 'gcs',
    uploadUrl,
    publicUrl: `https://storage.googleapis.com/${bucket.name}/${objectKey}`,
    method: 'PUT',
    headers: { 'Content-Type': contentType },
  };
}

async function createReadUrl(objectKey) {
  if (PROVIDER === 'azure') {
    const { BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } =
      require('@azure/storage-blob');
    const container = getAzureContainer();
    const blobClient = container.getBlobClient(objectKey);
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000);
    const accountMatch = process.env.AZURE_STORAGE_CONNECTION_STRING.match(/AccountName=([^;]+)/i);
    const keyMatch = process.env.AZURE_STORAGE_CONNECTION_STRING.match(/AccountKey=([^;]+)/i);
    const sharedKeyCredential = new StorageSharedKeyCredential(accountMatch[1], keyMatch[1]);
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName: objectKey,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
      },
      sharedKeyCredential,
    ).toString();
    return `${blobClient.url}?${sasToken}`;
  }

  const bucket = getGcsBucket();
  const [readUrl] = await bucket.file(objectKey).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  });
  return readUrl;
}

module.exports = {
  buildObjectKey,
  createUploadUrl,
  createReadUrl,
};