import { format, formatDistance } from 'date-fns';
import { ko } from 'date-fns/locale';

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'yyyy년 MM월 dd일', { locale: ko });
};

export const formatRelativeTime = (date: string | Date): string => {
  return formatDistance(new Date(date), new Date(), {
    addSuffix: true,
    locale: ko,
  });
};

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
};

export const formatTime = (time: string | null): string => {
  if (!time) return '정보 없음';

  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const period = h >= 12 ? '오후' : '오전';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;

  return `${period} ${displayHour}시 ${minutes}분`;
};
