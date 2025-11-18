import { useState } from 'react';
import { Icon } from '@iconify/react';

const DocumentViewer = ({ fileUrl, fileName, fileType, fileSize }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isImage = fileType?.startsWith('image/');
  const isPdf = fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
  const canPreview = isImage || isPdf;

  const handleView = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleView}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
        title="Visualiser"
      >
        <Icon icon="heroicons:eye" className="w-5 h-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-4">
                {fileName}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Télécharger"
                >
                  <Icon icon="heroicons:arrow-down-tray" className="w-5 h-5 text-gray-600" />
                </a>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Fermer"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              {canPreview ? (
                <div className="flex items-center justify-center min-h-full">
                  {isImage ? (
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  ) : isPdf ? (
                    <iframe
                      src={fileUrl}
                      className="w-full h-full min-h-[600px] rounded-lg shadow-lg border-0"
                      title={fileName}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-full text-center p-8">
                  <Icon icon="heroicons:document" className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Aperçu non disponible
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Ce type de fichier ne peut pas être prévisualisé dans le navigateur.
                  </p>
                  <a
                    href={fileUrl}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-glassy px-6 py-3 text-white font-semibold rounded-full hover:scale-105 transition-all inline-flex items-center gap-2"
                  >
                    <Icon icon="heroicons:arrow-down-tray" className="w-5 h-5" />
                    Télécharger le document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentViewer;

