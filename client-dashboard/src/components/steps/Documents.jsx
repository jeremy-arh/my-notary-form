import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Icon } from '@iconify/react';

const Documents = ({ formData, updateFormData, nextStep }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const newDocuments = acceptedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: URL.createObjectURL(file)
    }));

    updateFormData({
      documents: [...(formData.documents || []), ...newDocuments]
    });
  }, [formData.documents, updateFormData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const removeDocument = (index) => {
    const newDocuments = formData.documents.filter((_, i) => i !== index);
    updateFormData({ documents: newDocuments });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return 'heroicons:document-text';
    if (type.includes('word')) return 'heroicons:document';
    if (type.includes('image')) return 'heroicons:photo';
    return 'heroicons:document';
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 md:px-10 pt-6 md:pt-10 pb-44 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Upload Your Documents
            </h2>
            <p className="text-gray-600">
              Upload all necessary documents for the notary service
            </p>
          </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-black bg-gray-50 scale-[1.02]'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Icon
              icon="heroicons:cloud-arrow-up"
              className="w-10 h-10 text-gray-400"
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-1">
              {isDragActive ? 'Drop the files here' : 'Drag & drop your files here'}
            </p>
            <p className="text-sm text-gray-500">
              or click to browse from your computer
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <Icon icon="heroicons:document-text" className="w-4 h-4" />
            <span>PDF, DOC, DOCX, Images supported</span>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {formData.documents && formData.documents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Uploaded Files ({formData.documents.length})
          </h3>
          <div className="space-y-2">
            {formData.documents.map((doc, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <Icon
                    icon={getFileIcon(doc.type)}
                    className="w-10 h-10"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                >
                  <Icon
                    icon="heroicons:trash"
                    className="w-5 h-5 text-gray-400 group-hover:text-red-500"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Fixed Navigation */}
      <div className="flex-shrink-0 px-3 md:px-10 py-4 bg-[#F3F4F6] fixed lg:relative bottom-[70px] lg:bottom-auto left-0 right-0 z-50 lg:z-auto lg:border-t lg:border-gray-300">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={nextStep}
            className="btn-glassy px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default Documents;
