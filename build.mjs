import esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['embed.jsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: 'dist/accessibility-widget.js',
  loader: { '.jsx': 'jsx' },
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  target: ['es2017'],
});
console.log('BUILD_OK');
