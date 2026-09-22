import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { IEnquiry } from '../types';
import { formatDate, formatTime } from './date';

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportEnquiriesToExcel(records: IEnquiry[], titlePrefix = 'Office_Visitor_Register'): Promise<void> {
  const headers = ['Sr No', 'Client Name', 'Contact Number', 'Purpose / Reason of Visit', 'Fees Paid', 'Priority', 'Visit Date', 'Visit Time'];
  
  const headerRow = headers.map(csvCell).join(',');
  const dataRows = records.map((e, index) => {
    const entryDate = new Date(e.entryTime);
    return [
      csvCell(index + 1),
      csvCell(e.fullName),
      csvCell(e.contactNo),
      csvCell(e.purpose),
      csvCell(e.feesPaid),
      csvCell(e.urgency),
      csvCell(formatDate(entryDate)),
      csvCell(formatTime(entryDate)),
    ].join(',');
  });

  // UTF-8 Byte Order Mark (\uFEFF) ensures Microsoft Excel properly displays Unicode/names
  const csvContent = '\uFEFF' + headerRow + '\n' + dataRows.join('\n');
  await exportCsvContent(csvContent, titlePrefix);
}

export async function exportCsvContent(csvContent: string, titlePrefix = 'Office_Visitor_Register'): Promise<void> {
  const normalizedContent = csvContent.startsWith('\uFEFF') ? csvContent : `\uFEFF${csvContent}`;
  const now = new Date();
  const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `${titlePrefix}_${dateStamp}.csv`;

  if (Platform.OS === 'web') {
    const web = globalThis as any;
    const blob = new web.Blob([normalizedContent], { type: 'text/csv;charset=utf-8;' });
    const url = web.URL.createObjectURL(blob);
    const link = web.document.createElement('a');
    link.href = url;
    link.download = fileName;
    web.document.body.appendChild(link);
    link.click();
    link.remove();
    web.URL.revokeObjectURL(url);
    return;
  }

  // Native iOS / Android File Export
  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const fileUri = `${cacheDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, normalizedContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Office Visitor Register (CSV)',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

export async function exportCsvFromServer(
  request: { url: string; headers?: Record<string, string> },
  titlePrefix = 'Office_Visitor_Register',
): Promise<void> {
  const now = new Date();
  const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `${titlePrefix}_${dateStamp}.csv`;

  if (Platform.OS === 'web') {
    const web = globalThis as any;
    const link = web.document.createElement('a');
    link.href = request.url;
    link.download = fileName;
    web.document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const fileUri = `${cacheDir}${fileName}`;
  const download = await FileSystem.downloadAsync(request.url, fileUri, { headers: request.headers });
  if (download.status < 200 || download.status >= 300) throw new Error('The server could not export the register.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(download.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Office Visitor Register (CSV)',
    UTI: 'public.comma-separated-values-text',
  });
}
