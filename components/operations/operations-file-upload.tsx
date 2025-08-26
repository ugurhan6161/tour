"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, File, Download, Trash2, FileText, ImageIcon } from "lucide-react"

interface OperationsFileUploadProps {
  taskId: string
  fileType: "trip_document" | "other"
}

interface TaskFile {
  id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  mime_type: string
  created_at: string
  uploaded_by: string
}

export default function OperationsFileUpload({ taskId, fileType }: OperationsFileUploadProps) {
  const [files, setFiles] = useState<TaskFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchFiles()
  }, [taskId, fileType])

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("task_files")
      .select("*")
      .eq("task_id", taskId)
      .eq("file_type", fileType)
      .order("created_at", { ascending: false })

    if (data) {
      setFiles(data)
    }
  }

  const handleFileUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles.length) return

    setUploading(true)

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    for (const file of Array.from(selectedFiles)) {
      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop()
        const fileName = `${taskId}/${fileType}/${Date.now()}.${fileExt}`

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
          uploaded_by: user.id,
        })

        if (dbError) throw dbError
      } catch (error) {
        console.error("Error uploading file:", error)
      }
    }

    setUploading(false)
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
    const { data } = await supabase.storage.from("task-files").download(file.file_path)

    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = file.file_name
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const deleteFile = async (file: TaskFile) => {
    if (confirm("Are you sure you want to delete this file?")) {
      // Delete from storage
      await supabase.storage.from("task-files").remove([file.file_path])

      // Delete from database
      await supabase.from("task_files").delete().eq("id", file.id)

      fetchFiles()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    } else if (mimeType === "application/pdf") {
      return <FileText className="h-5 w-5 text-red-500" />
    } else {
      return <File className="h-5 w-5 text-gray-400" />
    }
  }

  const acceptedFileTypes = fileType === "trip_document" ? ".pdf,.doc,.docx,.jpg,.jpeg,.png" : "image/*,.pdf"

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-2">
          {fileType === "trip_document"
            ? "Drag and drop trip documents here, or click to select files"
            : "Drag and drop files here, or click to select files"}
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Supported formats: {fileType === "trip_document" ? "PDF, DOC, DOCX, JPG, PNG" : "Images and PDF"}
        </p>
        <input
          type="file"
          multiple
          accept={acceptedFileTypes}
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id={`file-upload-${fileType}`}
        />
        <Button
          onClick={() => document.getElementById(`file-upload-${fileType}`)?.click()}
          disabled={uploading}
          variant="outline"
          size="sm"
        >
          {uploading ? "Uploading..." : "Select Files"}
        </Button>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">
            {fileType === "trip_document" ? "Trip Documents" : "Uploaded Files"} ({files.length})
          </h4>
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.mime_type)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
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

      {files.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No {fileType === "trip_document" ? "trip documents" : "files"} uploaded yet.
        </div>
      )}
    </div>
  )
}
