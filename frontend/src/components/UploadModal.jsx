import React, { useState } from "react";
import { Upload, X, CheckCircle, AlertTriangle, FileUp } from "lucide-react";

const UploadModal = ({ isOpen, onClose, adminKey }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/upload", {
        method: "POST",
        headers: {
          "X-API-Key": adminKey,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "上傳失敗");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="text-emerald-400" />
              圖片上傳
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X />
            </button>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors bg-slate-950/50">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                  {file ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <FileUp className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="text-slate-200 font-medium">
                    {file ? file.name : "點擊選擇圖片"}
                  </div>
                  <div className="text-slate-500 text-sm mt-1">
                    支援 JPG, PNG, GIF, WebP (Max 5MB)
                  </div>
                </div>
              </label>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {result && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-2 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  上傳成功
                </div>
                <div className="bg-slate-950 p-2 rounded text-xs font-mono break-all select-all text-slate-300">
                  {result.full_url}
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {uploading ? "上傳中..." : "開始上傳"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
