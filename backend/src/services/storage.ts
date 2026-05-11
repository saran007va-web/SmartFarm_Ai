import { createClient, SupabaseClient, StorageFile } from '@supabase/supabase-js'
import config from '../config'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

interface UploadResult {
  success: boolean
  data?: {
    id: string
    name: string
    path: string
    url: string
    size: number
  }
  error?: string
}

interface SignedUrlResult {
  success: boolean
  signedUrl?: string
  error?: string
}

class StorageService {
  private client: SupabaseClient

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.serviceKey)
  }

  // Get bucket contents
  async listFiles(bucket: string, folderPath: string): Promise<StorageFile[]> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .list(folderPath, { limit: 100, offset: 0 })

    if (error) throw error
    return data || []
  }

  // Upload file
  async uploadFile(
    bucketName: string,
    filePath: string,
    file: Buffer | fs.ReadStream,
    options: {
      folder?: string
      contentType?: string
      cacheControl?: number
    } = {}
  ): Promise<UploadResult> {
    try {
      const { folder = '', contentType = 'application/octet-stream', cacheControl = 3600 } = options

      // Generate unique filename
      const ext = path.extname(filePath)
      const fileName = path.basename(filePath, ext)
      const uniqueName = `${fileName}-${uuidv4()}${ext}`
      const fullPath = folder ? `${folder}/${uniqueName}` : uniqueName

      // Upload to Supabase
      const { data, error } = await this.client.storage
        .from(bucketName)
        .upload(fullPath, file, {
          cacheControl,
          contentType,
          upsert: false,
        })

      if (error) {
        return { success: false, error: error.message }
      }

      // Get public URL
      const { data: urlData } = this.client.storage
        .from(bucketName)
        .getPublicUrl(fullPath)

      return {
        success: true,
        data: {
          id: uuidv4(),
          name: uniqueName,
          path: fullPath,
          url: urlData.publicUrl,
          size: 0,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  // Upload PDF specifically
  async uploadPDF(
    userId: string,
    farmId: string,
    fileName: string,
    file: Buffer
  ): Promise<UploadResult> {
    const bucketName = 'farm-documents'
    const folderPath = `${userId}/${farmId}/reports`

    return this.uploadFile(bucketName, fileName, file, {
      folder: folderPath,
      contentType: 'application/pdf',
      cacheControl: 86400, // 24 hours
    })
  }

  // Delete file
  async deleteFile(bucketName: string, filePath: string): Promise<boolean> {
    const { error } = await this.client.storage
      .from(bucketName)
      .remove([filePath])

    return !error
  }

  // Get signed URL for private access
  async getSignedUrl(
    bucketName: string,
    filePath: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, signedUrl: data.signedUrl }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate signed URL',
      }
    }
  }

  // Create signed upload URL (for client-side uploads)
  async createSignedUploadUrl(
    bucketName: string,
    filePath: string,
    contentType: string
  ): Promise<SignedUrlResult> {
    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath, contentType)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, signedUrl: data.signedUrl }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create upload URL',
      }
    }
  }

  // Copy file
  async copyFile(
    bucketName: string,
    sourcePath: string,
    destinationPath: string
  ): Promise<boolean> {
    const { error } = await this.client.storage
      .from(bucketName)
      .copy(sourcePath, destinationPath)

    return !error
  }

  // Get file metadata
  async getFileMetadata(bucketName: string, filePath: string): Promise<StorageFile | null> {
    const { data, error } = await this.client.storage
      .from(bucketName)
      .info(filePath)

    if (error) return null
    return data
  }

  // Move/Rename file
  async moveFile(
    bucketName: string,
    fromPath: string,
    toPath: string
  ): Promise<boolean> {
    const { error } = await this.client.storage
      .from(bucketName)
      .move(fromPath, toPath)

    return !error
  }

  // Download file
  async downloadFile(bucketName: string, filePath: string): Promise<Buffer | null> {
    const { data, error } = await this.client.storage
      .from(bucketName)
      .download(filePath)

    if (error) return null
    return Buffer.from(await data.arrayBuffer())
  }

  // Validate file type
  validateFileType(mimeType: string): boolean {
    const allowedTypes = config.upload.allowedMimeTypes
    return allowedTypes.includes(mimeType)
  }

  // Validate PDF
  validatePDF(mimeType: string, buffer: Buffer): boolean {
    if (mimeType !== 'application/pdf') return false

    // Check PDF magic bytes
    const header = buffer.slice(0, 5).toString()
    return header === '%PDF-'
  }
}

export const storageService = new StorageService()
export default storageService