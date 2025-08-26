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

export default function FileUpload({ taskId, profileId }: FileUploadProps) {
  const [files, setFiles] = useState<TaskFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchFiles()
  }, [taskId])

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("task_files")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })

    if (data) {
      setFiles(data)
    }
  }

  const handleFileUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles.length) return

    setUploading(true)

    for (const file of Array.from(selectedFiles)) {
      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop()
        const fileName = `${taskId}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("task-files")
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Save file record to database
        const { error: dbError } = await supabase.from("task_files").insert({
          task_id: taskId,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: file.type.startsWith("image/") ? "passport" : "other",
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: profileId,
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
    // Delete from storage
    await supabase.storage.from("task-files").remove([file.file_path])

    // Delete from database
    await supabase.from("task_files").delete().eq("id", file.id)

    fetchFiles()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

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
        <p className="text-sm text-gray-600 mb-2">Drag and drop passport images here, or click to select files</p>
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <Button
          onClick={() => document.getElementById("file-upload")?.click()}
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
          <h4 className="font-medium text-gray-900">Uploaded Files</h4>
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-gray-400" />
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
    </div>
  )
}
