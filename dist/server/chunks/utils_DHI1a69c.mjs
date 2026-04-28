function formatIdr(n) {
  if (n == null) return "IDR 0";
  return "IDR " + Math.round(n).toLocaleString("id-ID");
}

export { formatIdr as f };
