export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

export const getUsageTextColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-red-600';
  if (percentage >= 80) return 'text-orange-600';
  if (percentage >= 70) return 'text-yellow-600';
  return 'text-green-600';
};