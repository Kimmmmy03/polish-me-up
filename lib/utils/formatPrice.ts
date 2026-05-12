const myrFormatter = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMYR(amount: number): string {
  return `MYR ${myrFormatter.format(amount)}`;
}
