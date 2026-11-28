const express = require('express');
const Gallery = require('../models/Gallery');
const {
  buildObjectKey,
  createUploadUrl,
  createReadUrl,
} = require('../services/cloudMediaService');

const router = express.Router();

function addMonths(baseDate, months) {
  const validMonths = Number(months) === 6 ? 6 : 3;
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + validMonths);
  return { months: validMonths, expiresAt: d };
}

// Client: fetch active (unexpired) galleries for logged-in user with fresh signed read URLs
router.get('/my', async (req, res, next) => {
  try {
    const now = new Date();
    const galleries = await Gallery.find({
      client: req.user._id,
      isActive: true,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    const hydrated = await Promise.all(
      galleries.map(async (g) => {
        const obj = g.toObject();
        obj.items = await Promise.all(
          (obj.items || []).map(async (item) => ({
            ...item,
            signedUrl: await createReadUrl(item.objectKey).catch(() => item.url),
          })),
        );
        return obj;
      }),
    );

    res.status(200).json({ status: 'success', data: { galleries: hydrated } });
  } catch (err) {
    next(err);
  }
});

// Admin: create a client gallery with 3 or 6 months storage retention
router.post('/', async (req, res, next) => {
  try {
    const { title, clientId, bookingId, storageMonths = 3 } = req.body;
    const { months, expiresAt } = addMonths(new Date(), storageMonths);

    const gallery = await Gallery.create({
      title,
      client: clientId,
      booking: bookingId || undefined,
      storageMonths: months,
      expiresAt,
      items: [],
    });

    res.status(201).json({ status: 'success', data: { gallery } });
  } catch (err) {
    next(err);
  }
});

// Admin: request a direct signed upload URL for GCS or Azure Blob
router.post('/:id/upload-url', async (req, res, next) => {
  try {
    const { fileName, contentType, mediaType = 'image' } = req.body;
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) {
      return res.status(404).json({ status: 'fail', message: 'Gallery not found.' });
    }

    const objectKey = buildObjectKey({
      galleryId: String(gallery._id),
      originalName: fileName,
      mediaType,
    });
    const uploadInfo = await createUploadUrl({
      objectKey,
      contentType: contentType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
    });

    res.status(200).json({
      status: 'success',
      data: { objectKey, mediaType, ...uploadInfo },
    });
  } catch (err) {
    next(err);
  }
});

// Admin: attach uploaded cloud file metadata to the gallery in MongoDB
router.post('/:id/items', async (req, res, next) => {
  try {
    const { objectKey, url, provider, mediaType = 'image', caption = '' } = req.body;
    const gallery = await Gallery.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          items: { objectKey, url, provider, mediaType, caption },
        },
      },
      { new: true, runValidators: true },
    );
    if (!gallery) {
      return res.status(404).json({ status: 'fail', message: 'Gallery not found.' });
    }
    res.status(200).json({ status: 'success', data: { gallery } });
  } catch (err) {
    next(err);
  }
});

// Admin: extend gallery cloud retention by 3 or 6 months
router.patch('/:id/extend', async (req, res, next) => {
  try {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) {
      return res.status(404).json({ status: 'fail', message: 'Gallery not found.' });
    }

    const baseDate =
      gallery.expiresAt && gallery.expiresAt > new Date()
        ? new Date(gallery.expiresAt)
        : new Date();
    const { months, expiresAt } = addMonths(baseDate, req.body.storageMonths || 3);

    gallery.storageMonths = months;
    gallery.expiresAt = expiresAt;
    gallery.isActive = true;
    await gallery.save();

    res.status(200).json({ status: 'success', data: { gallery } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;