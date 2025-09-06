"use client";

import type React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import FileUpload from "../driver/file-upload";
import OperationsFileUpload from "./operations-file-upload";

interface FilesModalProps {
  task: any;
  onClose: () => void;
}

export default function FilesModal({ task, onClose }: FilesModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-green-600" />
            <span>Belgeler ve Dosyalar</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">Sefer Belgeleri</h3>
              <p className="text-sm text-blue-600 mb-4">
                Resmi sefer belgelerini ve diğer gerekli evrakları yükleyin.
              </p>
              <OperationsFileUpload taskId={task.id} fileType="trip_document" />
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
              <h3 className="text-lg font-semibold mb-4 text-green-800">Müşteri Belgeleri</h3>
              <p className="text-sm text-green-600 mb-4">
                Müşteri pasaport görüntülerini ve kimlik belgelerini görüntüleyin ve yönetin.
              </p>
              <FileUpload taskId={task.id} profileId={task.created_by} />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-800 mb-2">Görev Bilgileri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Görev:</span> {task.title}
              </div>
              <div>
                <span className="font-medium">Müşteri:</span> {task.customer_name}
              </div>
              <div>
                <span className="font-medium">Tarih:</span> {new Date(task.pickup_date).toLocaleDateString('tr-TR')}
              </div>
              <div>
                <span className="font-medium">Güzergah:</span> {task.pickup_location} → {task.dropoff_location}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}