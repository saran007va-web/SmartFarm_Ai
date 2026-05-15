import { createClient, SupabaseClient } from '@supabase/supabase-js'
import config from '../config'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import ws from 'ws'

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
  private client: SupabaseClient | null
  private readonly enabled: boolean

  constructor() {
    this.enabled = Boolean(config.supabase.url && config.supabase.serviceKey)
    this.client = this.enabled
      ? createClient(config.supabase.url, config.supabase.serviceKey, {
          realtime: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transport: ws as any,
          },
        })
      : null
  }

  private getClient(): SupabaseClient | null {
    return this.client
  }

  // Get bucket contents
  async listFiles(bucket: string, folderPath: string): Promise<unknown[]> {
    if (!this.getClient()) return []

    const { data } = await this.getClient()!.storage
      .from(bucket)
      .list(folderPath, { limit: 100, offset: 0 })

    return data || []
  }

  // Upload file
  async uploadFile(
    bucketName: string,
    filePath: string,
    file: Buffer,
    options: {
      folder?: string
      contentType?: string
      cacheControl?: number
    } = {}
  ): Promise<UploadResult> {
    try {
      if (!this.getClient()) {
        return { success: false, error: 'Supabase storage is not configured' }
      }

      const { folder = '', contentType = 'application/octet-stream', cacheControl = 3600 } = options

      const ext = path.extname(filePath)
      const fileName = path.basename(filePath, ext)
      const uniqueName = `${fileName}-${uuidv4()}${ext}`
      const fullPath = folder ? `${folder}/${uniqueName}` : uniqueName

      const { data, error } = await this.getClient()!.storage
        .from(bucketName)
        .upload(fullPath, file, {
          cacheControl: String(cacheControl),
          contentType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          upsert: false as any,
        })

      if (error) {
        return { success: false, error: error.message }
      }

      const { data: urlData } = this.getClient()!.storage
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
      cacheControl: 86400,
    })
  }

  async deleteFile(bucketName: string, filePath: string): Promise<boolean> {
    if (!this.getClient()) return false

    const { error } = await this.getClient()!.storage
      .from(bucketName)
      .remove([filePath])

    return !error
  }

  async getSignedUrl(
    bucketName: string,
    filePath: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      if (!this.getClient()) {
        return { success: false, error: 'Supabase storage is not configured' }
      }

      const { data, error } = await this.getClient()!.storage
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

  async createSignedUploadUrl(
    bucketName: string,
    filePath: string,
    contentType: string
  ): Promise<SignedUrlResult> {
    try {
      if (!this.getClient()) {
        return { success: false, error: 'Supabase storage is not configured' }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (this.getClient()!.storage as any)
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

  async copyFile(
    bucketName: string,
    sourcePath: string,
    destinationPath: string
  ): Promise<boolean> {
    if (!this.getClient()) return false

    const { error } = await this.getClient()!.storage
      .from(bucketName)
      .copy(sourcePath, destinationPath)

    return !error
  }

  async getFileMetadata(bucketName: string, filePath: string): Promise<Record<string, unknown> | null> {
    if (!this.getClient()) return null

    const { data, error } = await this.getClient()!.storage
      .from(bucketName)
      .info(filePath)

    if (error) return null
    return data as Record<string, unknown>
  }

  async moveFile(
    bucketName: string,
    fromPath: string,
    toPath: string
  ): Promise<boolean> {
    if (!this.getClient()) return false

    const { error } = await this.getClient()!.storage
      .from(bucketName)
      .move(fromPath, toPath)

    return !error
  }

  async downloadFile(bucketName: string, filePath: string): Promise<Buffer | null> {
    if (!this.getClient()) return null

    const { data, error } = await this.getClient()!.storage
      .from(bucketName)
      .download(filePath)

    if (error) return null
    return Buffer.from(await data.arrayBuffer())
  }

  validateFileType(mimeType: string): boolean {
    const allowedTypes = config.upload.allowedMimeTypes
    return allowedTypes.includes(mimeType)
  }

  validatePDF(mimeType: string, buffer: Buffer): boolean {
    if (mimeType !== 'application/pdf') return false
    const header = buffer.slice(0, 5).toString()
    return header === '%PDF-'
  }
}

export const storageService = new StorageService()
export default storageService