const express = require('express');
const Gallery = require('../models/galleryModel');
const {
  computeExpiresAt,
  getSignedReadUrl,
  getSignedUploadUrl,
} = require('../services/gcsGalleryService');

const router = express.Router();

// POST /api/v1/galleries - Create a 3- or 6-month client gallery
router.post('/', async (req, res, next) => {
  try {
    const clientEmail = String(req.body.clientEmail || '')
      .trim()
      .toLowerCase();
    const clientName = String(req.body.clientName || '').trim();
    const title = String(req.body.title || '').trim();
    const retentionMonths = Number(req.body.retentionMonths) === 6 ? 6 : 3;

    if (!clientEmail || !title) {
      return res.status(400).json({
        status: 'fail',
        message: 'Client email and gallery title are required.',
      });
    }

    const gallery = await Gallery.create({
      clientEmail,
      clientName,
      bookingId: req.body.bookingId || undefined,
      title,
      retentionMonths,
      expiresAt: computeExpiresAt(retentionMonths),
      status: 'active',
      items: Array.isArray(req.body.items) ? req.body.items : [],
    });

    res.status(201).json({
      status: 'success',
      data: { gallery },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/galleries/:id/upload-url - Generate a v4 signed upload URL for GCS
router.post('/:id/upload-url', async (req, res, next) => {
  try {
    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Gallery not found.' });
    }

    if (gallery.isExpired()) {
      return res.status(410).json({
        status: 'fail',
        message: 'This gallery retention window has expired.',
      });
    }

    const fileName = String(req.body.fileName || '').trim();
    const contentType = String(req.body.contentType || '').trim();
    const mediaType = req.body.mediaType === 'video' ? 'video' : 'image';

    if (!fileName || !contentType) {
      return res.status(400).json({
        status: 'fail',
        message: 'fileName and contentType are required.',
      });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `galleries/${gallery._id}/${Date.now()}-${safeName}`;
    const uploadUrl = await getSignedUploadUrl(objectKey, contentType);

    gallery.items.push({
      key: objectKey,
      fileName,
      mediaType,
      contentType,
      sizeBytes: Number(req.body.sizeBytes) || 0,
    });
    await gallery.save();

    res.status(200).json({
      status: 'success',
      data: { uploadUrl, objectKey, gallery },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/galleries/client?email=... - Fetch active galleries with signed read URLs
router.get('/client', async (req, res, next) => {
  try {
    const clientEmail = String(req.query.email || '')
      .trim()
      .toLowerCase();
    if (!clientEmail) {
      return res.status(400).json({
        status: 'fail',
        message: 'Client email is required.',
      });
    }

    const now = new Date();
    const galleries = await Gallery.find({
      clientEmail,
      status: 'active',
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    const hydratedGalleries = await Promise.all(
      galleries.map(async gallery => {
        const itemsWithUrls = await Promise.all(
          (gallery.items || []).map(async item => ({
            key: item.key,
            fileName: item.fileName,
            mediaType: item.mediaType,
            contentType: item.contentType,
            sizeBytes: item.sizeBytes,
            signedUrl: await getSignedReadUrl(item.key),
          })),
        );

        return {
          _id: gallery._id,
          title: gallery.title,
          clientName: gallery.clientName,
          retentionMonths: gallery.retentionMonths,
          expiresAt: gallery.expiresAt,
          createdAt: gallery.createdAt,
          items: itemsWithUrls,
        };
      }),
    );

    res.status(200).json({
      status: 'success',
      results: hydratedGalleries.length,
      data: { galleries: hydratedGalleries },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
