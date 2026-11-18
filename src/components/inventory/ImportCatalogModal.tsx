import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
} from 'lucide-react';
import { Product, Batch } from '../../types';
import { fmtNio, fmtUsd } from './inventoryHelpers';

interface ImportCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (
    products: (Partial<Product> & { batchName?: string })[],
    newBatches: string[]
  ) => Promise<void>;
  batches: Batch[];
  existingProducts?: Product[];
  exchangeRate: number;
  role: string;
}

interface ParsedRow {
  line: number;
  sku: string;
  name: string;
  batchName: string;
  stock: number;
  costUsd: number;
  priceUsd: number;
  priceNio: number;
  isValid: boolean;
  isUpdate: boolean;
  error?: string;
}

const STEPS = ['Elige tu archivo', 'Revisa los datos', 'Listo'];

export const ImportCatalogModal: React.FC<ImportCatalogModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  batches,
  existingProducts = [],
  exchangeRate,
  role,
}) => {
  const isOwner = role !== 'seller';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setError(null);
    setShowOnlyProblems(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const valid = parsedRows.filter((r) => r.isValid);
  const invalid = parsedRows.filter((r) => !r.isValid);
  const newCount = valid.filter((r) => !r.isUpdate).length;
  const updCount = valid.filter((r) => r.isUpdate).length;

  const downloadTemplate = () => {
    const rows: Record<string, any>[] = [
      {
        Producto: 'Camisa azul talla M',
        Cantidad: 10,
        ...(isOwner ? { 'Costo US$': 4.5 } : {}),
        'Precio US$': 9,
        'Precio C$': 330,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mis productos');
    XLSX.writeFile(wb, 'Plantilla_mis_productos.xlsx');
  };

  const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const parseRows = (rawRows: any[]) => {
    const rows: ParsedRow[] = [];
    const seenSkus = new Set<string>();
    const existingSkuSet = new Set(existingProducts.map((p) => p.sku.trim().toUpperCase()));

    rawRows.forEach((row, idx) => {
      const n: Record<string, any> = {};
      Object.keys(row).forEach((k) => (n[normalizeKey(k)] = row[k]));

      const name = String(
        n['nombre'] || n['descripcion'] || n['producto'] || n['name'] || n['desc'] || ''
      ).trim();
      const rawSku =
        n['sku'] || n['codigo'] || n['cod'] || n['item'] || n['referencia'] || '';
      const sku = String(rawSku).trim() || `SKU-${idx + 1}`;
      const upperSku = sku.toUpperCase();

      const batchName = String(
        n['lote'] || n['categoria'] || n['batch'] || n['coleccion'] || n['grupo'] || 'Inventario General'
      ).trim();

      const rawStock =
        n['stock'] || n['cantidad'] || n['cant'] || n['qty'] || n['existencias'] || 1;
      const stock = Math.max(0, parseInt(String(rawStock), 10) || 0);

      const costUsd = Math.max(
        0,
        parseFloat(
          String(n['costo'] || n['costousd'] || n['cost'] || n['costobase'] || n['unitcost'] || 0)
        ) || 0
      );
      const priceUsd = Math.max(
        0,
        parseFloat(
          String(n['precio'] || n['preciousd'] || n['price'] || n['precioventa'] || n['pvp'] || 0)
        ) || 0
      );
      let priceNio =
        parseFloat(
          String(
            n['precionic'] ||
              n['precionio'] ||
              n['cordobas'] ||
              n['preciocordobas'] ||
              n['precioc'] ||
              n['precioc$'] ||
              0
          )
        ) || 0;
      if (priceNio === 0 && priceUsd > 0) priceNio = Math.round(priceUsd * exchangeRate * 100) / 100;

      let isValid = true;
      let err = '';
      if (!name && !rawSku) {
        isValid = false;
        err = 'No tiene nombre ni código. Escribe el nombre del producto.';
      } else if (seenSkus.has(upperSku)) {
        isValid = false;
        err = `Está repetido en el archivo (${sku}).`;
      } else if (priceUsd === 0 && priceNio === 0) {
        isValid = false;
        err = 'Falta el precio de venta.';
      } else {
        seenSkus.add(upperSku);
      }

      rows.push({
        line: idx + 2,
        sku,
        name: name || `Producto ${sku}`,
        batchName: batchName || 'Inventario General',
        stock,
        costUsd,
        priceUsd,
        priceNio,
        isValid,
        isUpdate: isValid && existingSkuSet.has(upperSku),
        error: err,
      });
    });

    setParsedRows(rows);
  };

  const processFile = (f: File) => {
    setError(null);
    setFile(f);
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const json: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (json.length === 0) {
          setError('El archivo está vacío. Revisa que tenga al menos un producto.');
          setFile(null);
        } else {
          parseRows(json);
          setStep(2);
        }
      } catch (err) {
        console.error('Error leyendo archivo:', err);
        setError('No pudimos leer ese archivo. Usa un Excel (.xlsx, .xls) o CSV.');
        setFile(null);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError('No pudimos abrir el archivo. Intenta de nuevo.');
      setFile(null);
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(f);
  };

  const handleConfirmImport = async () => {
    if (valid.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const existingBatchNames = new Set(batches.map((b) => b.name.toLowerCase()));
      const newBatchesToCreate = Array.from(
        new Set(valid.map((r) => r.batchName).filter((nm) => !existingBatchNames.has(nm.toLowerCase())))
      );
      const items: (Partial<Product> & { batchName?: string })[] = valid.map((r) => ({
        sku: r.sku,
        name: r.name,
        batchName: r.batchName,
        stock_current: r.stock,
        ...(isOwner ? { base_cost_usd: r.costUsd, landed_cost_usd: r.costUsd } : {}),
        price_usd: r.priceUsd,
        price_nio: r.priceNio,
      }));
      await onImportSuccess(items, newBatchesToCreate);
      setImportedCount(valid.length);
      setStep(3);
    } catch (err) {
      console.error('Error guardando importación:', err);
      setError('Algo salió mal al guardar. No se perdió nada, intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleRows = (showOnlyProblems ? invalid : parsedRows).slice(0, 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-deepSlate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full border border-nacre-200 shadow-xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Encabezado + pasos */}
        <div className="px-6 py-5 border-b border-nacre-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-600">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-deepSlate-900">Subir mi lista de productos</h3>
                <p className="text-sm text-deepSlate-500">Desde un archivo de Excel o CSV</p>
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Cerrar"
              className="min-w-[44px] min-h-[44px] rounded-xl text-deepSlate-400 hover:bg-nacre-100 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ol className="flex items-center gap-2 mt-4">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <li key={label} className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-full text-sm font-extrabold flex items-center justify-center shrink-0 ${
                      done
                        ? 'bg-emerald-500 text-white'
                        : active
                        ? 'bg-coral-500 text-white'
                        : 'bg-nacre-200 text-deepSlate-500'
                    }`}
                  >
                    {done ? '✓' : n}
                  </span>
                  <span
                    className={`text-sm truncate ${
                      active ? 'font-bold text-deepSlate-900' : 'text-deepSlate-500'
                    } ${active ? '' : 'hidden sm:inline'}`}
                  >
                    {label}
                  </span>
                  {n < 3 && <span className="flex-1 h-0.5 bg-nacre-200 hidden sm:block" />}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PASO 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) processFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-coral-300 hover:border-coral-500 bg-coral-50/30 rounded-3xl p-8 sm:p-12 text-center cursor-pointer flex flex-col items-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                    e.target.value = '';
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-coral-500 mb-4">
                  {isProcessing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                </div>
                <p className="text-base font-bold text-deepSlate-900">
                  {isProcessing ? 'Leyendo tu archivo...' : 'Toca aquí para elegir tu archivo'}
                </p>
                <p className="text-sm text-deepSlate-500 mt-1">o arrástralo hasta este cuadro</p>
              </div>

              <div className="rounded-2xl bg-nacre-50 border border-nacre-200 p-4 text-sm text-deepSlate-700 space-y-2">
                <p className="font-bold text-deepSlate-900">¿Cómo debe verse tu archivo?</p>
                <p>
                  Una fila por producto, con columnas como <strong>Producto</strong>, <strong>Cantidad</strong>
                  {isOwner && (
                    <>
                      , <strong>Costo US$</strong>
                    </>
                  )}
                  , <strong>Precio US$</strong> o <strong>Precio C$</strong>. Si solo pones el precio en dólares, lo
                  pasamos a córdobas por ti (tasa C$ {exchangeRate}).
                </p>
                <p>Si un producto ya existe, se actualiza en vez de repetirse.</p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="min-h-[44px] inline-flex items-center gap-2 text-coral-700 font-bold hover:underline"
                >
                  <Download className="w-4 h-4" /> Bajar un archivo de ejemplo
                </button>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-deepSlate-600 truncate">
                  <strong className="text-deepSlate-900">{file?.name}</strong> · {parsedRows.length} filas
                </p>
                <button
                  onClick={reset}
                  className="min-h-[44px] px-3 text-sm font-bold text-coral-700 hover:underline"
                >
                  Elegir otro archivo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <p className="text-2xl font-extrabold text-emerald-700">{newCount}</p>
                  <p className="text-xs sm:text-sm text-emerald-800 font-semibold">Productos nuevos</p>
                </div>
                <div className="rounded-2xl bg-coral-50 border border-coral-200 p-3 text-center">
                  <p className="text-2xl font-extrabold text-coral-700">{updCount}</p>
                  <p className="text-xs sm:text-sm text-coral-800 font-semibold">Se actualizan</p>
                </div>
                <div
                  className={`rounded-2xl border p-3 text-center ${
                    invalid.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-nacre-50 border-nacre-200'
                  }`}
                >
                  <p className={`text-2xl font-extrabold ${invalid.length > 0 ? 'text-rose-700' : 'text-deepSlate-400'}`}>
                    {invalid.length}
                  </p>
                  <p className={`text-xs sm:text-sm font-semibold ${invalid.length > 0 ? 'text-rose-800' : 'text-deepSlate-500'}`}>
                    Con problema
                  </p>
                </div>
              </div>

              {invalid.length > 0 && (
                <div className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <span>
                    Las filas con problema <strong>no se van a subir</strong>. Puedes corregirlas en tu archivo y subirlo
                    de nuevo, o continuar sin ellas.
                  </span>
                  <button
                    onClick={() => setShowOnlyProblems((v) => !v)}
                    className="min-h-[44px] px-2 font-bold underline shrink-0"
                  >
                    {showOnlyProblems ? 'Ver todas' : 'Ver solo problemas'}
                  </button>
                </div>
              )}

              <div className="border border-nacre-200 rounded-2xl overflow-hidden">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-nacre-50 border-b border-nacre-200 text-deepSlate-600">
                      <tr>
                        <th className="py-2.5 px-3">Qué pasará</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-center">Cantidad</th>
                        {isOwner && <th className="py-2.5 px-3 text-right">Costo</th>}
                        <th className="py-2.5 px-3 text-right">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nacre-100">
                      {visibleRows.map((r) => (
                        <tr key={r.line} className={r.isValid ? '' : 'bg-rose-50/50'}>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {r.isValid ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  r.isUpdate
                                    ? 'bg-coral-50 text-coral-700 border-coral-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {r.isUpdate ? 'Se actualiza' : 'Nuevo'}
                              </span>
                            ) : (
                              <span className="text-rose-700 font-bold text-xs">Fila {r.line}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-deepSlate-900 max-w-[220px]">
                            <span className="block truncate">{r.name}</span>
                            {!r.isValid && <span className="block text-xs text-rose-700 font-medium">{r.error}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">{r.stock}</td>
                          {isOwner && (
                            <td className="py-2.5 px-3 text-right text-deepSlate-500">{fmtUsd(r.costUsd)}</td>
                          )}
                          <td className="py-2.5 px-3 text-right font-bold text-coral-600">{fmtNio(r.priceNio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 100 && !showOnlyProblems && (
                  <div className="p-2 text-center text-sm text-deepSlate-500 bg-nacre-50 border-t border-nacre-200">
                    Te mostramos las primeras 100 filas. Se subirán todas las correctas.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-xl font-extrabold text-deepSlate-900">¡Listo!</h4>
              <p className="text-base text-deepSlate-600 mt-1">
                Subimos {importedCount} {importedCount === 1 ? 'producto' : 'productos'} a tu lista.
              </p>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-6 py-4 border-t border-nacre-200 bg-nacre-50/80 flex items-center justify-between gap-3">
          {step === 2 ? (
            <button
              onClick={reset}
              className="min-h-[48px] px-4 rounded-xl text-sm font-bold text-deepSlate-700 hover:bg-nacre-200/60 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
          ) : step === 1 ? (
            <button onClick={close} className="min-h-[48px] px-4 rounded-xl text-sm font-bold text-deepSlate-700 hover:bg-nacre-200/60">
              Cancelar
            </button>
          ) : (
            <span />
          )}

          {step === 2 && (
            <button
              onClick={handleConfirmImport}
              disabled={isSaving || valid.length === 0}
              className="min-h-[48px] px-6 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Subiendo...
                </>
              ) : (
                <>
                  Subir {valid.length} {valid.length === 1 ? 'producto' : 'productos'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
          {step === 3 && (
            <button
              onClick={close}
              className="min-h-[48px] px-6 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600"
            >
              Ver mis productos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
