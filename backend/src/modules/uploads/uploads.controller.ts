import { Router, Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import prisma from '../../services/database'
import storageService from '../../services/storage'
import { authenticate, optionalAuth, AuthRequest } from '../auth/auth.middleware'
import config from '../../config'

const router = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed'))
    }
  },
})

// Get all files for farm (supports both authenticated and device-based)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { farmId, fileType, device_id } = req.query

    // Use userId if authenticated, otherwise use device_id
    const userId = req.user?.userId || device_id as string

    if (!userId) {
      res.status(400).json({ error: 'User ID or device ID required' })
      return
    }

    const where: any = { userId }
    if (farmId) where.farmId = farmId
    if (fileType) where.fileType = fileType

    const files = await prisma.uploadedFile.findMany({
      where,
      include: { farm: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    })

    res.json({ files })
  } catch (error) {
    console.error('Error fetching files:', error)
    res.status(500).json({ error: 'Failed to fetch files' })
  }
})

// Upload file (supports both authenticated and device-based)
router.post('/upload', optionalAuth, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('[Upload] Request received, file:', req.file?.originalname)

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    // Extract device_id from body OR query params
    const deviceId = req.body?.device_id || req.body?.deviceId || req.query?.device_id as string
    const farmId = req.body?.farmId || req.body?.farm_id || req.query?.farm_id
    const fileType = req.body?.fileType || req.body?.file_type || 'DOCUMENT'
    const description = req.body?.description
    const tags = req.body?.tags

    // Use userId if authenticated, otherwise use device_id
    const userId = req.user?.userId || deviceId

    console.log('[Upload] UserID:', userId, 'DeviceID:', deviceId)

    if (!userId) {
      res.status(400).json({ error: 'User ID or device ID required' })
      return
    }

    // Validate file type
    if (!storageService.validateFileType(req.file.mimetype)) {
      res.status(400).json({ error: 'File type not allowed. Allowed: PDF, TXT, MD' })
      return
    }

    // For PDFs, validate magic bytes
    if (req.file.mimetype === 'application/pdf') {
      const buffer = req.file.buffer.slice(0, 5)
      const header = buffer.toString()
      if (header !== '%PDF-') {
        res.status(400).json({ error: 'Invalid PDF file' })
        return
      }
    }

    console.log('[Upload] Uploading to Supabase with userId:', userId)

    // Upload to Supabase
    let result
    try {
      result = await storageService.uploadPDF(
        userId,
        farmId || 'general',
        req.file.originalname,
        req.file.buffer
      )
    } catch (uploadError: any) {
      console.error('[Upload] Supabase exception:', uploadError?.message || uploadError)
      res.status(500).json({ error: 'Storage upload failed: ' + (uploadError?.message || 'Unknown error') })
      return
    }

    if (!result) {
      res.status(500).json({ error: 'Storage service returned no result' })
      return
    }

    if (!result.success) {
      console.error('[Upload] Supabase error:', result.error)
      res.status(500).json({ error: result.error || 'Failed to upload to storage' })
      return
    }

    console.log('[Upload] Saving to database...')

    // Save metadata to database
    const file = await prisma.uploadedFile.create({
      data: {
        userId: userId,
        farmId: farmId || null,
        fileName: req.file.originalname,
        fileType: fileType as any,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        storageKey: result.data!.path,
        bucketName: 'farm-documents',
        publicUrl: result.data!.url,
        description,
        tags: tags ? JSON.parse(tags) : [],
      },
    })

    console.log('[Upload] Success:', file.id)
    res.status(201).json({ file })
  } catch (error) {
    console.error('[Upload] Error:', error)
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

// Get signed URL for download
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    })

    if (!file) {
      res.status(404).json({ error: 'File not found' })
      return
    }

    // Get signed URL
    const result = await storageService.getSignedUrl(file.bucketName, file.storageKey, 3600)

    if (!result.success) {
      res.status(500).json({ error: result.error })
      return
    }

    res.json({ downloadUrl: result.signedUrl })
  } catch (error) {
    console.error('Error getting download URL:', error)
    res.status(500).json({ error: 'Failed to get download URL' })
  }
})

// Delete file
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    })

    if (!file) {
      res.status(404).json({ error: 'File not found' })
      return
    }

    // Delete from Supabase
    await storageService.deleteFile(file.bucketName, file.storageKey)

    // Delete from database
    await prisma.uploadedFile.delete({ where: { id: req.params.id } })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    res.status(500).json({ error: 'Failed to delete file' })
  }
})

// Update file metadata
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description, tags } = req.body

    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    })

    if (!file) {
      res.status(404).json({ error: 'File not found' })
      return
    }

    const updated = await prisma.uploadedFile.update({
      where: { id: req.params.id },
      data: { description, tags },
    })

    res.json({ file: updated })
  } catch (error) {
    console.error('Error updating file:', error)
    res.status(500).json({ error: 'Failed to update file' })
  }
})

// Get upload signed URL (for chunked uploads)
router.post('/signed-url', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileName, contentType, farmId } = req.body

    const fileId = uuidv4()
    const ext = path.extname(fileName)
    const storageKey = `${req.user!.userId}/${farmId || 'general'}/uploads/${fileId}${ext}`

    const result = await storageService.createSignedUploadUrl(
      'farm-documents',
      storageKey,
      contentType
    )

    if (!result.success) {
      res.status(500).json({ error: result.error })
      return
    }

    res.json({
      uploadUrl: result.signedUrl,
      storageKey,
      fileId,
    })
  } catch (error) {
    console.error('Error creating signed URL:', error)
    res.status(500).json({ error: 'Failed to create signed URL' })
  }
})

// Confirm upload after client-side upload
router.post('/confirm-upload', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId, fileName, fileSize, mimeType, storageKey, farmId, fileType, description } = req.body

    // Get file metadata from Supabase
    const fileInfo = await storageService.getFileMetadata('farm-documents', storageKey)

    // Save to database
    const file = await prisma.uploadedFile.create({
      data: {
        id: fileId,
        userId: req.user!.userId,
        farmId: farmId || null,
        fileName,
        fileType: fileType || 'DOCUMENT',
        fileSize: fileSize || (fileInfo?.metadata as Record<string, unknown>)?.size as number || 0,
        mimeType,
        storageKey,
        bucketName: 'farm-documents',
        publicUrl: `${config.supabase.url}/storage/v1/object/public/farm-documents/${storageKey}`,
        description,
      },
    })

    res.status(201).json({ file })
  } catch (error) {
    console.error('Error confirming upload:', error)
    res.status(500).json({ error: 'Failed to confirm upload' })
  }
})

export default router