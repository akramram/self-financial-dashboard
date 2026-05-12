import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_DX3j8JO6.mjs';
import { manifest } from './manifest_c4XE7kjY.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/add.astro.mjs');
const _page2 = () => import('./pages/api/categories/_id_.astro.mjs');
const _page3 = () => import('./pages/api/categories.astro.mjs');
const _page4 = () => import('./pages/api/export.astro.mjs');
const _page5 = () => import('./pages/api/import.astro.mjs');
const _page6 = () => import('./pages/api/income/_month_.astro.mjs');
const _page7 = () => import('./pages/api/income.astro.mjs');
const _page8 = () => import('./pages/api/networth/_month_.astro.mjs');
const _page9 = () => import('./pages/api/networth.astro.mjs');
const _page10 = () => import('./pages/api/summary.astro.mjs');
const _page11 = () => import('./pages/api/transactions/_id_.astro.mjs');
const _page12 = () => import('./pages/api/transactions.astro.mjs');
const _page13 = () => import('./pages/networth/edit.astro.mjs');
const _page14 = () => import('./pages/networth.astro.mjs');
const _page15 = () => import('./pages/settings.astro.mjs');
const _page16 = () => import('./pages/transactions.astro.mjs');
const _page17 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/node.js", _page0],
    ["src/pages/add.astro", _page1],
    ["src/pages/api/categories/[id].ts", _page2],
    ["src/pages/api/categories/index.ts", _page3],
    ["src/pages/api/export.ts", _page4],
    ["src/pages/api/import.ts", _page5],
    ["src/pages/api/income/[month].ts", _page6],
    ["src/pages/api/income/index.ts", _page7],
    ["src/pages/api/networth/[month].ts", _page8],
    ["src/pages/api/networth/index.ts", _page9],
    ["src/pages/api/summary.ts", _page10],
    ["src/pages/api/transactions/[id].ts", _page11],
    ["src/pages/api/transactions/index.ts", _page12],
    ["src/pages/networth/edit.astro", _page13],
    ["src/pages/networth.astro", _page14],
    ["src/pages/settings.astro", _page15],
    ["src/pages/transactions.astro", _page16],
    ["src/pages/index.astro", _page17]
]);
const serverIslandMap = new Map();
const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "mode": "standalone",
    "client": "file:///root/self-financial-dashboard/dist/client/",
    "server": "file:///root/self-financial-dashboard/dist/server/",
    "host": false,
    "port": 4321,
    "assets": "_astro"
};
const _exports = createExports(_manifest, _args);
const handler = _exports['handler'];
const startServer = _exports['startServer'];
const options = _exports['options'];
const _start = 'start';
{
	serverEntrypointModule[_start](_manifest, _args);
}

export { handler, options, pageMap, startServer };
