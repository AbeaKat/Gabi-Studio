import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Table,
  HelpCircle
} from 'lucide-react';
import { Product, Batch } from '../../types';

interface ImportCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (products: Partial<Product>[], newBatches: string[]) => Promise<void>;
  batches: Batch[];
  exchangeRate: number;
  role: string;
}

interface ParsedRow {
  sku: string;
  name: string;
  batchName: string;
  stock: number;
  costUsd: number;
  priceUsd: number;
  priceNio: number;
  isValid: boolean;
  error?: string;
}

export const ImportCatalogModal: React.FC<ImportCatalogModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  batches,
  exchangeRate,
  role,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = (fileToProcess: File) => {
    setFile(fileToProcess);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        parseRows(jsonData);
      } catch (err) {
        console.error('Error leyendo archivo Excel/CSV:', err);
        alert('No se pudo procesar el archivo. Asegúrate de que sea un archivo Excel (.xlsx, .xls) o CSV válido.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(fileToProcess);
  };

  const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const parseRows = (rawRows: any[]) => {
    const rows: ParsedRow[] = [];
    const seenSkus = new Set<string>();
    let validCount = 0;
    let invalidCount = 0;

    rawRows.forEach((row, idx) => {
      const keys = Object.keys(row);
      const rowNormalized: Record<string, any> = {};
      keys.forEach((k) => {
        rowNormalized[normalizeKey(k)] = row[k];
      });

      // Detect SKU
      const rawSku =
        rowNormalized['sku'] ||
        rowNormalized['codigo'] ||
        rowNormalized['cod'] ||
        rowNormalized['item'] ||
        rowNormalized['referencia'] ||
        `SKU-${idx + 1}`;

      const sku = String(rawSku).trim();

      // Detect Name
      const name = String(
        rowNormalized['nombre'] ||
        rowNormalized['descripcion'] ||
        rowNormalized['producto'] ||
        rowNormalized['name'] ||
        rowNormalized['desc'] ||
        ''
      ).trim();

      // Detect Batch / Category
      const batchName = String(
        rowNormalized['lote'] ||
        rowNormalized['categoria'] ||
        rowNormalized['batch'] ||
        rowNormalized['coleccion'] ||
        rowNormalized['grupo'] ||
        'Inventario General'
      ).trim();

      // Detect Stock
      const rawStock =
        rowNormalized['stock'] ||
        rowNormalized['cantidad'] ||
        rowNormalized['cant'] ||
        rowNormalized['qty'] ||
        rowNormalized['existencias'] ||
        1;
      const stock = Math.max(0, parseInt(String(rawStock), 10) || 0);

      // Detect Cost USD
      const rawCost =
        rowNormalized['costo'] ||
        rowNormalized['costousd'] ||
        rowNormalized['cost'] ||
        rowNormalized['costobase'] ||
        rowNormalized['unitcost'] ||
        0;
      const costUsd = Math.max(0, parseFloat(String(rawCost)) || 0);

      // Detect Price USD
      const rawPrice =
        rowNormalized['precio'] ||
        rowNormalized['preciousd'] ||
        rowNormalized['price'] ||
        rowNormalized['precioventa'] ||
        rowNormalized['pvp'] ||
        0;
      const priceUsd = Math.max(0, parseFloat(String(rawPrice)) || 0);

      // Detect Price NIO
      const rawPriceNio =
        rowNormalized['precionic'] ||
        rowNormalized['precionio'] ||
        rowNormalized['cordobas'] ||
        rowNormalized['preciocordobas'] ||
        rowNormalized['precioc'] ||
        0;
      let priceNio = parseFloat(String(rawPriceNio)) || 0;
      if (priceNio === 0 && priceUsd > 0) {
        priceNio = Math.round(priceUsd * exchangeRate * 100) / 100;
      }

      // Validation
      let isValid = true;
      let error = '';

      if (!sku) {
        isValid = false;
        error = 'SKU vacío';
      } else if (seenSkus.has(sku)) {
        isValid = false;
        error = `SKU duplicado (${sku})`;
      } else {
        seenSkus.add(sku);
      }

      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      rows.push({
        sku,
        name: name || `Producto ${sku}`,
        batchName: batchName || 'Inventario General',
        stock,
        costUsd,
        priceUsd,
        priceNio,
        isValid,
        error,
      });
    });

    setParsedRows(rows);
    setStats({ total: rows.length, valid: validCount, invalid: invalidCount });
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsSaving(true);
    try {
      // Find any new batches to create
      const existingBatchNames = new Set(batches.map((b) => b.name.toLowerCase()));
      const newBatchesToCreate = Array.from(
        new Set(
          validRows
            .map((r) => r.batchName)
            .filter((name) => !existingBatchNames.has(name.toLowerCase()))
        )
      );

      const productsToImport: Partial<Product>[] = validRows.map((r) => ({
        sku: r.sku,
        name: r.name,
        stock_current: r.stock,
        base_cost_usd: r.costUsd,
        landed_cost_usd: r.costUsd,
        price_usd: r.priceUsd,
        price_nio: r.priceNio,
      }));

      await onImportSuccess(productsToImport, newBatchesToCreate);
      onClose();
    } catch (err) {
      console.error('Error guardando importación:', err);
      alert('Ocurrió un error al guardar los productos en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-nacre-200 shadow-modal-depth flex flex-col max-h-[90vh] overflow-hidden animate-modal-enter">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-nacre-200 flex items-center justify-between bg-nacre-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-deepSlate-900">
                Importador de Catálogo Excel / CSV
              </h3>
              <p className="text-xs text-deepSlate-500">
                Procesamiento directo en tu navegador con validación previa de códigos y precios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-deepSlate-400 hover:text-deepSlate-700 hover:bg-nacre-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Upload Dropzone */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-coral-200 hover:border-coral-400 bg-coral-50/20 hover:bg-coral-50/40 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-white shadow-md shadow-coral-500/10 flex items-center justify-center text-coral-500 mb-4 group-hover:scale-105 transition-transform">
                {isProcessing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
              </div>
              <p className="text-sm sm:text-base font-bold text-deepSlate-900">
                {isProcessing ? 'Leyendo archivo...' : 'Haz clic para seleccionar o arrastra tu archivo aquí'}
              </p>
              <p className="text-xs text-deepSlate-500 mt-1 max-w-sm">
                Soporta archivos <strong>.xlsx, .xls o .csv</strong>. El sistema mapea automáticamente columnas como SKU, Producto, Lote, Stock, Costo y Precio.
              </p>
              <div className="mt-4 inline-flex items-center space-x-1.5 text-[11px] font-semibold text-coral-600 bg-white px-3 py-1 rounded-full border border-coral-200">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Conversión automática de Precio USD a Córdobas (Tasa: C${exchangeRate})</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* File Info Bar */}
              <div className="bg-nacre-100/70 border border-nacre-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-6 h-6 text-coral-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-deepSlate-900 truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-deepSlate-500">
                      {(file.size / 1024).toFixed(1)} KB • {stats.total} filas leídas
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{stats.valid} válidos</span>
                  </span>
                  {stats.invalid > 0 && (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{stats.invalid} con alerta</span>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setFile(null);
                      setParsedRows([]);
                    }}
                    className="text-xs font-semibold text-coral-600 hover:text-coral-700 px-2 py-1"
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-nacre-200 rounded-2xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-nacre-50 border-b border-nacre-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-deepSlate-700">
                    <Table className="w-4 h-4 text-coral-500" />
                    <span>Previsualización de Datos ({parsedRows.length} registros)</span>
                  </div>
                  <span className="text-[11px] text-deepSlate-500">
                    {role === 'seller' ? 'Columnas de costo ocultas para vendedores' : 'Muestra costos y precios'}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-nacre-50/60 border-b border-nacre-200 text-deepSlate-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Lote / Categoría</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        {role !== 'seller' && <th className="py-2.5 px-3 text-right">Costo ($)</th>}
                        <th className="py-2.5 px-3 text-right">Precio ($)</th>
                        <th className="py-2.5 px-3 text-right">Precio (C$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nacre-100">
                      {parsedRows.slice(0, 100).map((r, i) => (
                        <tr
                          key={i}
                          className={r.isValid ? 'hover:bg-nacre-50/50' : 'bg-rose-50/40 text-rose-900'}
                        >
                          <td className="py-2.5 px-3">
                            {r.isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <div className="flex items-center space-x-1 text-rose-600 font-bold text-[11px]" title={r.error}>
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span className="truncate max-w-[80px]">{r.error}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-deepSlate-900">{r.sku}</td>
                          <td className="py-2.5 px-3 font-medium text-deepSlate-800 truncate max-w-xs">{r.name}</td>
                          <td className="py-2.5 px-3 text-deepSlate-500">
                            <span className="px-2 py-0.5 rounded bg-nacre-100 text-[10px] font-semibold text-deepSlate-700">
                              {r.batchName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold">{r.stock}</td>
                          {role !== 'seller' && (
                            <td className="py-2.5 px-3 text-right font-mono text-deepSlate-500">
                              ${r.costUsd.toFixed(2)}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-deepSlate-900">
                            ${r.priceUsd.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-coral-600">
                            C${r.priceNio.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedRows.length > 100 && (
                  <div className="p-2 text-center text-xs text-deepSlate-400 bg-nacre-50 border-t border-nacre-200">
                    Mostrando las primeras 100 filas de {parsedRows.length} en la vista previa.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-nacre-200 bg-nacre-50/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-deepSlate-600 hover:bg-nacre-200/50 transition-colors"
          >
            Cancelar
          </button>

          {file && (
            <button
              onClick={handleConfirmImport}
              disabled={isSaving || stats.valid === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando al catálogo...</span>
                </>
              ) : (
                <>
                  <span>Confirmar e Importar {stats.valid} Productos</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
