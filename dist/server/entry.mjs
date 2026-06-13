import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_B35HkTHX.mjs';
import { manifest } from './manifest_BVU0dpq7.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/add.astro.mjs');
const _page2 = () => import('./pages/analytics.astro.mjs');
const _page3 = () => import('./pages/api/analytics.astro.mjs');
const _page4 = () => import('./pages/api/anomalies.astro.mjs');
const _page5 = () => import('./pages/api/categories/_id_.astro.mjs');
const _page6 = () => import('./pages/api/categories.astro.mjs');
const _page7 = () => import('./pages/api/export.astro.mjs');
const _page8 = () => import('./pages/api/fire.astro.mjs');
const _page9 = () => import('./pages/api/forecast.astro.mjs');
const _page10 = () => import('./pages/api/goals/_id_.astro.mjs');
const _page11 = () => import('./pages/api/goals.astro.mjs');
const _page12 = () => import('./pages/api/health.astro.mjs');
const _page13 = () => import('./pages/api/import.astro.mjs');
const _page14 = () => import('./pages/api/income/_id_.astro.mjs');
const _page15 = () => import('./pages/api/income.astro.mjs');
const _page16 = () => import('./pages/api/investments/summary.astro.mjs');
const _page17 = () => import('./pages/api/investments/_id_.astro.mjs');
const _page18 = () => import('./pages/api/investments.astro.mjs');
const _page19 = () => import('./pages/api/kickoff.astro.mjs');
const _page20 = () => import('./pages/api/networth/_id_.astro.mjs');
const _page21 = () => import('./pages/api/networth.astro.mjs');
const _page22 = () => import('./pages/api/recurring/_id_.astro.mjs');
const _page23 = () => import('./pages/api/recurring.astro.mjs');
const _page24 = () => import('./pages/api/summary.astro.mjs');
const _page25 = () => import('./pages/api/transactions/_id_.astro.mjs');
const _page26 = () => import('./pages/api/transactions.astro.mjs');
const _page27 = () => import('./pages/budget.astro.mjs');
const _page28 = () => import('./pages/calendar.astro.mjs');
const _page29 = () => import('./pages/cashflow.astro.mjs');
const _page30 = () => import('./pages/compare.astro.mjs');
const _page31 = () => import('./pages/fire.astro.mjs');
const _page32 = () => import('./pages/forecast.astro.mjs');
const _page33 = () => import('./pages/goals.astro.mjs');
const _page34 = () => import('./pages/health.astro.mjs');
const _page35 = () => import('./pages/networth/edit.astro.mjs');
const _page36 = () => import('./pages/networth.astro.mjs');
const _page37 = () => import('./pages/portfolio.astro.mjs');
const _page38 = () => import('./pages/recurring.astro.mjs');
const _page39 = () => import('./pages/settings.astro.mjs');
const _page40 = () => import('./pages/transactions.astro.mjs');
const _page41 = () => import('./pages/yearly.astro.mjs');
const _page42 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/node.js", _page0],
    ["src/pages/add.astro", _page1],
    ["src/pages/analytics.astro", _page2],
    ["src/pages/api/analytics/index.ts", _page3],
    ["src/pages/api/anomalies/index.ts", _page4],
    ["src/pages/api/categories/[id].ts", _page5],
    ["src/pages/api/categories/index.ts", _page6],
    ["src/pages/api/export.ts", _page7],
    ["src/pages/api/fire/index.ts", _page8],
    ["src/pages/api/forecast/index.ts", _page9],
    ["src/pages/api/goals/[id].ts", _page10],
    ["src/pages/api/goals/index.ts", _page11],
    ["src/pages/api/health/index.ts", _page12],
    ["src/pages/api/import.ts", _page13],
    ["src/pages/api/income/[id].ts", _page14],
    ["src/pages/api/income/index.ts", _page15],
    ["src/pages/api/investments/summary.ts", _page16],
    ["src/pages/api/investments/[id].ts", _page17],
    ["src/pages/api/investments/index.ts", _page18],
    ["src/pages/api/kickoff.ts", _page19],
    ["src/pages/api/networth/[id].ts", _page20],
    ["src/pages/api/networth/index.ts", _page21],
    ["src/pages/api/recurring/[id].ts", _page22],
    ["src/pages/api/recurring/index.ts", _page23],
    ["src/pages/api/summary.ts", _page24],
    ["src/pages/api/transactions/[id].ts", _page25],
    ["src/pages/api/transactions/index.ts", _page26],
    ["src/pages/budget.astro", _page27],
    ["src/pages/calendar.astro", _page28],
    ["src/pages/cashflow.astro", _page29],
    ["src/pages/compare.astro", _page30],
    ["src/pages/fire.astro", _page31],
    ["src/pages/forecast.astro", _page32],
    ["src/pages/goals.astro", _page33],
    ["src/pages/health.astro", _page34],
    ["src/pages/networth/edit.astro", _page35],
    ["src/pages/networth.astro", _page36],
    ["src/pages/portfolio.astro", _page37],
    ["src/pages/recurring.astro", _page38],
    ["src/pages/settings.astro", _page39],
    ["src/pages/transactions.astro", _page40],
    ["src/pages/yearly.astro", _page41],
    ["src/pages/index.astro", _page42]
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
    "client": "file:///Users/user/hermes-workspace/self-financial-dashboard/dist/client/",
    "server": "file:///Users/user/hermes-workspace/self-financial-dashboard/dist/server/",
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
