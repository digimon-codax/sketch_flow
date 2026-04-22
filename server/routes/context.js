import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { localUpload, memoryUpload, uploadFileStorage, deleteFileStorage } from '../services/storageService.js';

const router = Router();
router.use(authenticate);

const useS3 = !!process.env.AWS_BUCKET;
const uploadMiddleware = useS3 ? memoryUpload.single('file') : localUpload.single('file');

// Helper to ensure an Element exists before creating Context
const ensureElement = async (elementId, diagramId, fabricId) => {
  let element = await prisma.element.findUnique({ where: { id: elementId } });
  if (!element) {
    element = await prisma.element.create({
      data: { id: elementId, diagramId, fabricId }
    });
  }
  return element;
};

// GET /api/context/:elementId — Get context data
router.get('/:elementId', async (req, res) => {
  try {
    const { elementId } = req.params;
    const context = await prisma.context.findUnique({
      where: { elementId },
      include: { files: true }
    });

    if (!context) {
      return res.json({ notes: '', links: [], codeSnippet: '', files: [] });
    }
    res.json(context);
  } catch (error) {
    console.error('[/api/context] Error fetching context:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/context/:elementId — Update notes, links, code
router.patch('/:elementId', async (req, res) => {
  try {
    const { elementId } = req.params;
    const { notes, links, codeSnippet, diagramId, fabricId } = req.body;

    if (diagramId && fabricId) {
      await ensureElement(elementId, diagramId, fabricId);
    }

    const context = await prisma.context.upsert({
      where: { elementId },
      update: { notes, links, codeSnippet },
      create: { elementId, notes, links, codeSnippet }
    });

    res.json(context);
  } catch (error) {
    console.error('[/api/context] Error updating context:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/context/:elementId/files — Upload file
router.post('/:elementId/files', uploadMiddleware, async (req, res) => {
  try {
    const { elementId } = req.params;
    const { diagramId, fabricId } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (diagramId && fabricId) {
      await ensureElement(elementId, diagramId, fabricId);
    }

    // Ensure Context exists
    let context = await prisma.context.findUnique({ where: { elementId } });
    if (!context) {
      context = await prisma.context.create({ data: { elementId } });
    }

    const url = await uploadFileStorage(req.file);

    const fileRecord = await prisma.file.create({
      data: {
        contextId: context.id,
        name: req.file.originalname,
        url,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    res.status(201).json(fileRecord);
  } catch (error) {
    console.error('[/api/context] Error uploading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/context/:elementId/files/:fileId
router.delete('/:elementId/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Delete from storage (S3 or local)
    await deleteFileStorage(file.url);

    // Delete from DB
    await prisma.file.delete({ where: { id: fileId } });

    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('[/api/context] Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
