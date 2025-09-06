"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, File, Download, Trash2 } from "lucide-react"

interface FileUploadProps {
  taskId: string
  profileId: string
  fileType?: 'passport' | 'trip_document' | 'other'
  maxFiles?: number
  showPreview?: boolean
}

interface TaskFile {
  id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  mime_type: string
  created_at: string
}

export default function FileUpload({ 
  taskId, 
  profileId, 
  fileType = 'passport', 
  maxFiles = 10,
  showPreview = true 
}: FileUploadProps) {
  const [files, setFiles] = useState<TaskFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [previewImages, setPreviewImages] = useState<{[key: string]: string}>({})
  const supabase = createClient()

  useEffect(() => {
    fetchFiles()
  }, [taskId])

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("task_files")
      .select("*")
      .eq("task_id", taskId)
      .eq("file_type", fileType)
      .order("created_at", { ascending: false })

    if (data) {
      setFiles(data)
      // Generate preview URLs for images
      if (showPreview) {
        generatePreviewUrls(data)
      }
    }
  }

  const generatePreviewUrls = async (fileList: TaskFile[]) => {
    const previews: {[key: string]: string} = {}
    
    for (const file of fileList) {
      if (file.mime_type?.startsWith('image/')) {
        try {
          const { data, error } = await supabase.storage
            .from('task-files')
            .createSignedUrl(file.file_path, 3600)
          
          if (data && !error) {
            previews[file.id] = data.signedUrl
          }
        } catch (error) {
          console.error('Error generating preview URL:', error)
        }
      }
    }
    
    setPreviewImages(previews)
  }

  const handleFileUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles.length) return
    
    // Check max files limit
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maksimum ${maxFiles} dosya yükleyebilirsiniz`)
      return
    }

    setUploading(true)
    setUploadProgress(0)
    
    const totalFiles = selectedFiles.length
    let uploadedFiles = 0

    for (const file of Array.from(selectedFiles)) {
      try {
        // Validate file type based on fileType prop
        if (fileType === 'passport' && !file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file for passport: ${file.name}`)
          continue
        }
        
        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop()
        const fileName = `${taskId}/${fileType}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("task-files")
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Save file record to database
        const { error: dbError } = await supabase.from("task_files").insert({
          task_id: taskId,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: profileId,
        })

        if (dbError) throw dbError
        
        uploadedFiles++
        setUploadProgress((uploadedFiles / totalFiles) * 100)
      } catch (error) {
        console.error("Error uploading file:", error)
      }
    }

    setUploading(false)
    setUploadProgress(0)
    fetchFiles()
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const downloadFile = async (file: TaskFile) => {
    try {
      const { data, error } = await supabase.storage.from("task-files").download(file.file_path)

      if (error) throw error
      if (data) {
        const url = URL.createObjectURL(data)
        const a = document.createElement("a")
        a.href = url
        a.download = file.file_name
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const deleteFile = async (file: TaskFile) => {
    if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      return
    }
    
    try {
      // Delete from storage
      await supabase.storage.from("task-files").remove([file.file_path])

      // Delete from database
      await supabase.from("task_files").delete().eq("id", file.id)

      // Remove preview URL
      const newPreviews = { ...previewImages }
      delete newPreviews[file.id]
      setPreviewImages(newPreviews)

      fetchFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileTypeConfig = () => {
    switch (fileType) {
      case 'passport':
        return {
          accept: 'image/*',
          title: 'Pasaport Resimleri',
          description: 'Pasaport resimlerini buraya yükleyin',
          icon: <Upload className="h-8 w-8 text-green-400 mx-auto mb-2" />
        }
      case 'trip_document':
        return {
          accept: '.pdf,.doc,.docx,image/*',
          title: 'Sefer Belgesi',
          description: 'Sefer belgesini buraya yükleyin',
          icon: <Upload className="h-8 w-8 text-blue-400 mx-auto mb-2" />
        }
      default:
        return {
          accept: '*/*',
          title: 'Dosyalar',
          description: 'Dosyaları buraya yükleyin',
          icon: <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        }
    }
  }

  const config = getFileTypeConfig()

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? fileType === 'passport' 
              ? "border-green-500 bg-green-50" 
              : "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {config.icon}
        <p className="text-sm text-gray-600 mb-2">{config.description}</p>
        {files.length > 0 && (
          <p className="text-xs text-gray-500 mb-2">{files.length}/{maxFiles} dosya yüklendi</p>
        )}
        
        {uploading && (
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  fileType === 'passport' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Yükleniyor... {Math.round(uploadProgress)}%</p>
          </div>
        )}
        
        <input
          type="file"
          multiple={fileType === 'passport'}
          accept={config.accept}
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id={`file-upload-${fileType}`}
          disabled={uploading || files.length >= maxFiles}
        />
        <Button
          onClick={() => document.getElementById(`file-upload-${fileType}`)?.click()}
          disabled={uploading || files.length >= maxFiles}
          variant="outline"
          size="sm"
          className={files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {uploading ? "Yükleniyor..." : files.length >= maxFiles ? "Limit Doldu" : "Dosya Seçin"}
        </Button>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {showPreview && fileType === 'passport' ? (
            /* Grid view for passport images */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-green-200">
                    {previewImages[file.id] ? (
                      <img
                        src={previewImages[file.id]}
                        alt={file.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <File className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => downloadFile(file)}
                        size="sm"
                        variant="outline"
                        className="bg-white text-black hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deleteFile(file)}
                        size="sm"
                        variant="outline"
                        className="bg-white text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 text-center">
                    <p className="text-xs text-gray-600 truncate">{file.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List view for other files */
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Yüklenen Dosyalar</h4>
              {files.map((file) => (
                <Card key={file.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <File className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => downloadFile(file)} size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteFile(file)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
