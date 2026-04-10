import React from 'react';
import { AlertTriangle, Loader2, Trash2, CheckCircle2, UserPlus } from 'lucide-react';
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
  variant?: 'danger' | 'primary' | 'success';
  icon?: React.ReactNode;
}

const ConfirmDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading,
  confirmLabel = 'Delete',
  variant = 'danger',
  icon,
}) => {
  const styles = {
    danger: {
      stripe: 'bg-gradient-to-r from-red-500 to-rose-600',
      iconWrap: 'bg-red-50 border-red-100',
      iconColor: 'text-red-600',
      action: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600',
      defaultIcon: <AlertTriangle className="h-6 w-6 text-red-600" strokeWidth={2} />,
      defaultBtnIcon: <Trash2 className="h-4 w-4" />,
    },
    primary: {
      stripe: 'bg-gradient-to-r from-app-primary to-app-primary-hover',
      iconWrap: 'bg-app-primary-light border-app-primary-subtle',
      iconColor: 'text-app-primary',
      action: 'bg-app-primary hover:bg-app-primary-hover focus-visible:ring-app-primary',
      defaultIcon: <UserPlus className="h-6 w-6 text-app-primary" strokeWidth={2} />,
      defaultBtnIcon: <UserPlus className="h-4 w-4" />,
    },
    success: {
      stripe: 'bg-gradient-to-r from-green-500 to-emerald-600',
      iconWrap: 'bg-green-50 border-green-100',
      iconColor: 'text-green-600',
      action: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-600',
      defaultIcon: <CheckCircle2 className="h-6 w-6 text-green-600" strokeWidth={2} />,
      defaultBtnIcon: <CheckCircle2 className="h-4 w-4" />,
    },
  } as const;

  const s = styles[variant];
  const loadingLabel = `${confirmLabel}${confirmLabel.endsWith('…') ? '' : '…'}`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-white">
        <div className={`h-1.5 w-full ${s.stripe}`} />
        <div className="px-6 pt-6 pb-2">
          <AlertDialogHeader className="items-start gap-4 sm:flex-row sm:text-left">
            <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full border mt-0.5 ${s.iconWrap}`}>
              {icon || s.defaultIcon}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <AlertDialogTitle className="text-base font-semibold text-gray-900 leading-snug">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-700 leading-relaxed">{description}</AlertDialogDescription>
            </div>
          </AlertDialogHeader>
        </div>
        <div className="mx-6 my-4 border-t border-gray-200" />
        <AlertDialogFooter className="px-6 pb-6 gap-3 sm:gap-2 flex-row justify-end">
          <AlertDialogCancel disabled={loading} className="flex-1 sm:flex-none min-w-[90px]">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading} className={`flex-1 sm:flex-none min-w-[90px] gap-2 text-app-primary-foreground font-medium disabled:opacity-60 ${s.action}`}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingLabel}
              </>
            ) : (
              <>
                {s.defaultBtnIcon}
                {confirmLabel}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
