import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación amigable (reemplaza window.confirm). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Sí, continuar',
  cancelLabel = 'No, volver',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deepSlate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-md w-full border border-nacre-200 shadow-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              danger ? 'bg-rose-50 text-rose-600' : 'bg-coral-50 text-coral-600'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-deepSlate-900">{title}</h3>
            <div className="text-sm text-deepSlate-600 mt-1">{message}</div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-5 rounded-xl text-sm font-bold text-deepSlate-700 bg-nacre-100 hover:bg-nacre-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[48px] px-5 rounded-xl text-sm font-bold text-white ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-coral-500 hover:bg-coral-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
