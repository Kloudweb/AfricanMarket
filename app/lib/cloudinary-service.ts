
import { v2 as cloudinary } from 'cloudinary'
import { DocumentType } from './types'

export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
  }

  // Upload file to Cloudinary
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    fileType: string,
    documentType: DocumentType,
    userId: string
  ): Promise<{
    success: boolean
    cloudinaryId?: string
    secureUrl?: string
    publicUrl?: string
    error?: string
  }> {
    try {
      return new Promise((resolve, reject) => {
        const folder = this.getFolderByDocumentType(documentType)
        const publicId = `${folder}/${userId}/${Date.now()}-${fileName}`

        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: `africanmarket/${folder}`,
            public_id: publicId,
            allowed_formats: this.getAllowedFormats(documentType),
            transformation: this.getTransformation(documentType),
            tags: [documentType, userId]
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error)
              resolve({
                success: false,
                error: error.message
              })
            } else if (result) {
              resolve({
                success: true,
                cloudinaryId: result.public_id,
                secureUrl: result.secure_url,
                publicUrl: result.url
              })
            } else {
              resolve({
                success: false,
                error: 'Unknown upload error'
              })
            }
          }
        ).end(buffer)
      })
    } catch (error) {
      console.error('Cloudinary service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Delete file from Cloudinary
  async deleteFile(cloudinaryId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(cloudinaryId)
      return result.result === 'ok'
    } catch (error) {
      console.error('Cloudinary delete error:', error)
      return false
    }
  }

  // Get optimized image URL
  getOptimizedImageUrl(
    cloudinaryId: string,
    width?: number,
    height?: number,
    quality?: string
  ): string {
    const transformations = []
    
    if (width) transformations.push(`w_${width}`)
    if (height) transformations.push(`h_${height}`)
    if (quality) transformations.push(`q_${quality}`)
    
    transformations.push('c_fill', 'f_auto')
    
    return cloudinary.url(cloudinaryId, {
      transformation: transformations.join(',')
    })
  }

  // Get folder based on document type
  private getFolderByDocumentType(documentType: DocumentType): string {
    const folderMap = {
      PROFILE_PHOTO: 'profiles',
      GOVERNMENT_ID: 'government-ids',
      DRIVERS_LICENSE: 'driver-licenses',
      VEHICLE_REGISTRATION: 'vehicle-registrations',
      VEHICLE_INSURANCE: 'vehicle-insurance',
      BUSINESS_LICENSE: 'business-licenses',
      FOOD_SAFETY_CERTIFICATE: 'food-safety',
      BUSINESS_REGISTRATION: 'business-registrations',
      TAX_CERTIFICATE: 'tax-certificates',
      BANK_STATEMENT: 'bank-statements',
      PROOF_OF_ADDRESS: 'proof-of-address',
      OTHER: 'other'
    }

    return folderMap[documentType] || 'other'
  }

  // Get allowed file formats based on document type
  private getAllowedFormats(documentType: DocumentType): string[] {
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    const documentFormats = ['pdf', 'doc', 'docx']

    const formatMap = {
      PROFILE_PHOTO: imageFormats,
      GOVERNMENT_ID: imageFormats,
      DRIVERS_LICENSE: imageFormats,
      VEHICLE_REGISTRATION: [...imageFormats, ...documentFormats],
      VEHICLE_INSURANCE: [...imageFormats, ...documentFormats],
      BUSINESS_LICENSE: [...imageFormats, ...documentFormats],
      FOOD_SAFETY_CERTIFICATE: [...imageFormats, ...documentFormats],
      BUSINESS_REGISTRATION: [...imageFormats, ...documentFormats],
      TAX_CERTIFICATE: [...imageFormats, ...documentFormats],
      BANK_STATEMENT: [...imageFormats, ...documentFormats],
      PROOF_OF_ADDRESS: [...imageFormats, ...documentFormats],
      OTHER: [...imageFormats, ...documentFormats]
    }

    return formatMap[documentType] || [...imageFormats, ...documentFormats]
  }

  // Get transformation settings based on document type
  private getTransformation(documentType: DocumentType): any {
    const baseTransformation = {
      quality: 'auto',
      fetch_format: 'auto'
    }

    const transformationMap = {
      PROFILE_PHOTO: {
        ...baseTransformation,
        width: 500,
        height: 500,
        crop: 'fill',
        gravity: 'face'
      },
      GOVERNMENT_ID: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      DRIVERS_LICENSE: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      VEHICLE_REGISTRATION: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      VEHICLE_INSURANCE: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      BUSINESS_LICENSE: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      FOOD_SAFETY_CERTIFICATE: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      BUSINESS_REGISTRATION: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      TAX_CERTIFICATE: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      },
      BANK_STATEMENT: {
        ...baseTransformation,
        width: 800,
        height: 1000,
        crop: 'limit'
      },
      PROOF_OF_ADDRESS: {
        ...baseTransformation,
        width: 800,
        height: 1000,
        crop: 'limit'
      },
      OTHER: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'limit'
      }
    }

    return transformationMap[documentType] || transformationMap.OTHER
  }

  // Validate file before upload
  validateFile(file: File, documentType: DocumentType): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedFormats = this.getAllowedFormats(documentType)
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' }
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      return { valid: false, error: `File type not allowed. Supported formats: ${allowedFormats.join(', ')}` }
    }

    return { valid: true }
  }

  // Extract text from image (OCR functionality)
  async extractTextFromImage(cloudinaryId: string): Promise<string | null> {
    try {
      const result = await cloudinary.uploader.upload(cloudinaryId, {
        ocr: 'adv_ocr'
      })

      return result.info?.ocr?.adv_ocr?.data?.[0]?.fullTextAnnotation?.text || null
    } catch (error) {
      console.error('OCR extraction error:', error)
      return null
    }
  }

  // Generate thumbnail
  async generateThumbnail(cloudinaryId: string, width: number = 200, height: number = 200): Promise<string> {
    return cloudinary.url(cloudinaryId, {
      transformation: [
        { width, height, crop: 'thumb', gravity: 'center' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    })
  }

  // Create signed upload URL for direct client uploads
  generateSignedUploadUrl(folder: string, publicId: string): { url: string; signature: string; timestamp: number } {
    const timestamp = Math.round(Date.now() / 1000)
    const params = {
      folder: `africanmarket/${folder}`,
      public_id: publicId,
      timestamp
    }

    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!)

    return {
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      signature,
      timestamp
    }
  }
}

export const cloudinaryService = new CloudinaryService()
