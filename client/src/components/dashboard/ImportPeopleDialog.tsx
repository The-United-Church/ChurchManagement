import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { PERSON_IMPORT_COLUMNS } from '@/types/person';
import type { PersonCreateDTO, ImportPeopleResult } from '@/types/person';

interface ImportPeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: Partial<PersonCreateDTO>[]) => Promise<ImportPeopleResult | false>;
  saving?: boolean;
}

// ── Template download ────────────────────────────────────────────────────────
function downloadTemplate() {
  const header = PERSON_IMPORT_COLUMNS.join(',');
  const sample = 'John,Doe,Michael,Johnny,1990-01-15,male,"123 Main St, Apt 4",Lagos,Ikeja,Nigeria,john@email.com,+234 7001234567';
  const csv = `${header}\n${sample}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'people_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── RFC-4180 compliant CSV parser ────────────────────────────────────────────
function parseCSV(text: string): Partial<PersonCreateDTO>[] {
  const rows: string[][] = [];
  let cur = '';
  let inQuotes = false;
  const cells: string[] = [''];
  let cellIdx = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cells[cellIdx] += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cells[cellIdx] += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cells.push(''); cellIdx++; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        rows.push([...cells]);
        cells.length = 0; cells.push(''); cellIdx = 0;
      } else { cells[cellIdx] += ch; }
    }
  }
  if (cells.some((c) => c !== '')) rows.push([...cells]);

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((values) => {
    const row: any = {};
    headers.forEach((h, i) => {
      const v = (values[i] ?? '').trim();
      if (v) row[h] = v;
    });
    return row;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────
const RowTable: React.FC<{ rows: Record<string, any>[]; reasonKey?: string }> = ({ rows, reasonKey }) => {
  if (rows.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">None</p>;
  const dataRows = reasonKey ? rows.map(({ row }) => row) : rows;
  const reasons: string[] = reasonKey ? rows.map((r) => r.reason) : [];
  const cols = Array.from(new Set(dataRows.flatMap(Object.keys))).slice(0, 6);

  return (
    <div className="overflow-auto rounded border text-xs max-h-52">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            {reasonKey && <th className="px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap">Reason</th>}
            {cols.map((c) => <th key={c} className="px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
              {reasonKey && <td className="px-2 py-1.5 text-red-600 max-w-[240px]">{reasons[i]}</td>}
              {cols.map((c) => <td key={c} className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{String(r[c] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ImportPeopleDialog: React.FC<ImportPeopleDialogProps> = ({ open, onOpenChange, onImport, saving }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Partial<PersonCreateDTO>[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportPeopleResult | null>(null);

  const reset = () => { setRows([]); setFileName(''); setResult(null); };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setRows(parseCSV(ev.target?.result as string));
    reader.readAsText(file);
    // reset file input so the same file can be re-selected
    e.target.value = '';
  };

  const handleImport = async () => {
    const res = await onImport(rows);
    if (res !== false) {
      setResult(res);
      setRows([]);
      setFileName('');
    }
  };

  const validCount = result?.valid.length ?? 0;
  const dupCount = result?.duplicates.length ?? 0;
  const invalidCount = result?.invalid.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-5xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Import People</DialogTitle>
        </DialogHeader>

        {/* ── RESULTS VIEW ── */}
        {result ? (
          <div className="space-y-4 py-2">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{validCount} imported</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2">
                <Copy className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">{dupCount} duplicate{dupCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">{invalidCount} invalid</span>
              </div>
            </div>

            <Tabs defaultValue={dupCount > 0 ? 'duplicates' : invalidCount > 0 ? 'invalid' : 'valid'}>
              <TabsList className="w-full">
                <TabsTrigger value="valid" className="flex-1 gap-2">
                  Imported <Badge variant="secondary">{validCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="duplicates" className="flex-1 gap-2">
                  Duplicates <Badge variant="secondary">{dupCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="invalid" className="flex-1 gap-2">
                  Invalid <Badge variant="secondary">{invalidCount}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="valid" className="mt-3">
                <RowTable rows={result.valid as any} />
              </TabsContent>
              <TabsContent value="duplicates" className="mt-3">
                <RowTable rows={result.duplicates as any} reasonKey="reason" />
              </TabsContent>
              <TabsContent value="invalid" className="mt-3">
                <RowTable rows={result.invalid as any} reasonKey="reason" />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* ── UPLOAD VIEW ── */
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download Template
              </Button>
              <span className="text-xs text-gray-500">CSV format · required: first_name, last_name</span>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              {fileName ? (
                <p className="text-sm font-medium text-teal-700">{fileName} — {rows.length} row(s) parsed</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Click to select a CSV file</p>
                  <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                </>
              )}
            </div>

            {rows.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">Preview (first 5 rows)</p>
                <div className="overflow-auto rounded border text-xs max-h-44">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        {Object.keys(rows[0]).map((k) => (
                          <th key={k} className="px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {Object.values(r).map((v, j) => (
                            <td key={j} className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[120px] truncate">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 5 && <p className="text-center py-1 text-gray-400">+{rows.length - 5} more rows</p>}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {result ? (
            <>
              <Button variant="outline" onClick={reset}>Import Another File</Button>
              <Button onClick={handleClose} className="bg-teal-600 hover:bg-teal-700 text-white">Done</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={saving || rows.length === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
                  : <><Upload className="h-4 w-4 mr-2" /> Import {rows.length > 0 ? `${rows.length} ` : ''}People</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportPeopleDialog;
