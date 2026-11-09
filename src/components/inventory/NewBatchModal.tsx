import React, { useState } from 'react';
import { X, Layers, AlertCircle, ArrowRight } from 'lucide-react';

interface NewBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('El nombre del lote o categoría es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name.trim());
      setName('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar la categoría.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full border border-nacre-200 shadow-modal-depth overflow-hidden flex flex-col animate-modal-enter">
        
        <div className="px-6 py-5 border-b border-nacre-200 flex items-center justify-between bg-nacre-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-coral-500 text-white flex items-center justify-center shadow-sm shadow-coral-500/25">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-deepSlate-900">
                Nueva Categoría / Lote
              </h3>
              <p className="text-xs text-deepSlate-500">
                Agrupa productos para control de inventario y costeo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-deepSlate-400 hover:text-deepSlate-700 hover:bg-nacre-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
              Nombre de la Categoría / Lote *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Repuestos de Freno Octubre, Tecnología 2026..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
              autoFocus
            />
          </div>

          <div className="pt-3 border-t border-nacre-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-deepSlate-600 hover:bg-nacre-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{isSaving ? 'Creando...' : 'Crear Categoría'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
