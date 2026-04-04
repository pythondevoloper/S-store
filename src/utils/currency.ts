export const formatCurrency = (amount: number, isUzs: boolean, rate: number) => {
  if (isUzs) {
    const uzsAmount = Math.round(amount * rate);
    return new Intl.NumberFormat('uz-UZ').format(uzsAmount) + " so'm";
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
