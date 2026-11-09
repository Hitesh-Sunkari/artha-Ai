import React from 'react';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, PlayCircle, ShieldCheck } from 'lucide-react';
import type { RunStatus } from '../api/types';

interface StatusBadgeProps {
  status: RunStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normStatus = (status || 'UNKNOWN').toUpperCase();

  const getConfig = () => {
    switch (normStatus) {
      case 'COMPLETED':
      case 'SUCCESS':
        return {
          icon: CheckCircle2,
          className: 'status-completed',
          label: 'Completed',
        };
      case 'RUNNING':
        return {
          icon: PlayCircle,
          className: 'status-running',
          label: 'Running',
        };
      case 'PENDING':
        return {
          icon: Clock,
          className: 'status-pending',
          label: 'Pending',
        };
      case 'FAILED':
      case 'ERROR':
        return {
          icon: AlertCircle,
          className: 'status-failed',
          label: 'Failed',
        };
      case 'CHALLENGED':
        return {
          icon: AlertTriangle,
          className: 'status-pending',
          label: 'Challenged',
        };
      case 'MEASURED':
        return {
          icon: CheckCircle2,
          className: 'status-completed',
          label: 'Measured Data',
        };
      case 'UNAVAILABLE':
        return {
          icon: AlertCircle,
          className: 'status-pending',
          label: 'Data Unavailable',
        };
      default:
        return {
          icon: ShieldCheck,
          className: 'status-pill',
          label: normStatus,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={`status-pill ${config.className}`}
      style={{
        padding: isSm ? '2px 8px' : '4px 10px',
        fontSize: isSm ? '10px' : '11px',
      }}
    >
      <Icon size={isSm ? 11 : 13} className={normStatus === 'RUNNING' ? 'animate-spin' : ''} />
      <span>{config.label}</span>
    </span>
  );
};
