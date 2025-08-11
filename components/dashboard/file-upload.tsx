"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  title: string;
  onFileSelect: (file: File) => void;
  isUploaded: boolean;
}

export function FileUpload({ title, onFileSelect, isUploaded }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isUploaded ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400',
        isDragActive && 'border-blue-500 bg-blue-50'
      )}
    >
      <input {...getInputProps()} />
      <FileText className={cn('w-12 h-12 mx-auto mb-4', isUploaded ? 'text-green-600' : 'text-gray-400')} />
      <p className="text-lg font-medium mb-2">{title}</p>
      <p className="text-sm text-gray-500 mb-4">
        {isUploaded ? 'File uploaded successfully!' : isDragActive ? 'Drop the file here...' : 'Drag & drop or click to upload'}
      </p>
      <span className={cn('inline-flex items-center px-4 py-2 rounded-md font-medium text-sm', isUploaded ? 'bg-green-600 text-white' : 'bg-blue-600 text-white')}>
        <Upload className="w-4 h-4 mr-2" />
        {isUploaded ? 'Re-upload File' : 'Select File'}
      </span>
    </div>
  );
}
