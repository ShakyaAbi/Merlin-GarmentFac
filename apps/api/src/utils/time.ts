const MS_PER_MINUTE = 1000 * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

// Formats a date as a human-readable relative time string
export const formatRelativeTime = (date: Date, now: Date = new Date()) => {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < MS_PER_MINUTE) return 'Just now';
  if (diffMs < MS_PER_HOUR) {
    const mins = Math.floor(diffMs / MS_PER_MINUTE);
    return `${mins} min${mins === 1 ? '' : 's'} ago`;
  }
  if (diffMs < MS_PER_DAY) {
    const hours = Math.floor(diffMs / MS_PER_HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(diffMs / MS_PER_DAY);
  if (days < 30) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString();
};

// Extracts up to two initials from a name or email
export const initialsFromName = (nameOrEmail: string) => {
  if (!nameOrEmail) return 'NA';
  const parts = nameOrEmail.split(/[\s@._-]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0].toUpperCase());
  return initials.join('') || 'NA';
};
