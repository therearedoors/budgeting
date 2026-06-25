function formatGBP(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function displayDate(date) {
  const iso = formatDate(date);
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${MONTHS[Number(month) - 1]} ${Number(day)} ${year}`;
}

module.exports = { formatGBP, formatDate, displayDate };