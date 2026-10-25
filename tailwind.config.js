/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // hover: utilities apply only where a real pointer can hover (ux-behavior-spec.md section 4).
  future: { hoverOnlyWhenSupported: true },
  theme: { extend: {} },
  plugins: [],
}
