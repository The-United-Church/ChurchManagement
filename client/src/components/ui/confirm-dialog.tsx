import React from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
  confirmLabel?: string;
}

const ConfirmDialog: React.FC<Props> = ({
  open, onOpenChange, title, description, onConfirm, loading, confirmLabel = 'Delete',
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-white">
      {/* Top danger stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-600" />

      <div className="px-6 pt-6 pb-2">
        {/* Icon + Header */}
        <AlertDialogHeader className="items-start gap-4 sm:flex-row sm:text-left">
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-100 mt-0.5">
            <AlertTriangle className="h-6 w-6 text-red-600" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <AlertDialogTitle className="text-base font-semibold text-gray-900 leading-snug">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-700 leading-relaxed">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
      </div>

      {/* Divider */}
      <div className="mx-6 my-4 border-t border-gray-200" />

      <AlertDialogFooter className="px-6 pb-6 gap-3 sm:gap-2 flex-row justify-end">
        <AlertDialogCancel
          disabled={loading}
          className="flex-1 sm:flex-none min-w-[90px]"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 sm:flex-none min-w-[90px] gap-2 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Deleting…
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              {confirmLabel}
            </>
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmDialog;
