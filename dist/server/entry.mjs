import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_B35HkTHX.mjs';
import { manifest } from './manifest_DB316R5L.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/achievements.astro.mjs');
const _page2 = () => import('./pages/add.astro.mjs');
const _page3 = () => import('./pages/analytics.astro.mjs');
const _page4 = () => import('./pages/api/analytics.astro.mjs');
const _page5 = () => import('./pages/api/anomalies.astro.mjs');
const _page6 = () => import('./pages/api/categories/_id_.astro.mjs');
const _page7 = () => import('./pages/api/categories.astro.mjs');
const _page8 = () => import('./pages/api/dna.astro.mjs');
const _page9 = () => import('./pages/api/export.astro.mjs');
const _page10 = () => import('./pages/api/fire.astro.mjs');
const _page11 = () => import('./pages/api/forecast.astro.mjs');
const _page12 = () => import('./pages/api/goals/_id_.astro.mjs');
const _page13 = () => import('./pages/api/goals.astro.mjs');
const _page14 = () => import('./pages/api/health.astro.mjs');
const _page15 = () => import('./pages/api/import.astro.mjs');
const _page16 = () => import('./pages/api/income/_id_.astro.mjs');
const _page17 = () => import('./pages/api/income.astro.mjs');
const _page18 = () => import('./pages/api/investments/summary.astro.mjs');
const _page19 = () => import('./pages/api/investments/_id_.astro.mjs');
const _page20 = () => import('./pages/api/investments.astro.mjs');
const _page21 = () => import('./pages/api/kickoff.astro.mjs');
const _page22 = () => import('./pages/api/matrix.astro.mjs');
const _page23 = () => import('./pages/api/networth/_id_.astro.mjs');
const _page24 = () => import('./pages/api/networth.astro.mjs');
const _page25 = () => import('./pages/api/recommendations.astro.mjs');
const _page26 = () => import('./pages/api/recurring/_id_.astro.mjs');
const _page27 = () => import('./pages/api/recurring.astro.mjs');
const _page28 = () => import('./pages/api/recurring-breakdown.astro.mjs');
const _page29 = () => import('./pages/api/savings-rate.astro.mjs');
const _page30 = () => import('./pages/api/scenario.astro.mjs');
const _page31 = () => import('./pages/api/spending-rhythm.astro.mjs');
const _page32 = () => import('./pages/api/streaks.astro.mjs');
const _page33 = () => import('./pages/api/summaries.astro.mjs');
const _page34 = () => import('./pages/api/summary.astro.mjs');
const _page35 = () => import('./pages/api/transactions/_id_.astro.mjs');
const _page36 = () => import('./pages/api/transactions.astro.mjs');
const _page37 = () => import('./pages/api/transactions-by-date.astro.mjs');
const _page38 = () => import('./pages/api/weekly-spending.astro.mjs');
const _page39 = () => import('./pages/budget.astro.mjs');
const _page40 = () => import('./pages/calendar.astro.mjs');
const _page41 = () => import('./pages/cashflow.astro.mjs');
const _page42 = () => import('./pages/compare.astro.mjs');
const _page43 = () => import('./pages/credit-card.astro.mjs');
const _page44 = () => import('./pages/dna.astro.mjs');
const _page45 = () => import('./pages/fire.astro.mjs');
const _page46 = () => import('./pages/forecast.astro.mjs');
const _page47 = () => import('./pages/goals.astro.mjs');
const _page48 = () => import('./pages/health.astro.mjs');
const _page49 = () => import('./pages/import.astro.mjs');
const _page50 = () => import('./pages/matrix.astro.mjs');
const _page51 = () => import('./pages/merchants.astro.mjs');
const _page52 = () => import('./pages/networth/edit.astro.mjs');
const _page53 = () => import('./pages/networth.astro.mjs');
const _page54 = () => import('./pages/portfolio.astro.mjs');
const _page55 = () => import('./pages/recommendations.astro.mjs');
const _page56 = () => import('./pages/recurring.astro.mjs');
const _page57 = () => import('./pages/report.astro.mjs');
const _page58 = () => import('./pages/savings-rate.astro.mjs');
const _page59 = () => import('./pages/settings.astro.mjs');
const _page60 = () => import('./pages/spending-mix.astro.mjs');
const _page61 = () => import('./pages/spending-rhythm.astro.mjs');
const _page62 = () => import('./pages/streaks.astro.mjs');
const _page63 = () => import('./pages/transactions.astro.mjs');
const _page64 = () => import('./pages/weekly.astro.mjs');
const _page65 = () => import('./pages/what-if.astro.mjs');
const _page66 = () => import('./pages/yearly.astro.mjs');
const _page67 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/node.js", _page0],
    ["src/pages/achievements.astro", _page1],
    ["src/pages/add.astro", _page2],
    ["src/pages/analytics.astro", _page3],
    ["src/pages/api/analytics/index.ts", _page4],
    ["src/pages/api/anomalies/index.ts", _page5],
    ["src/pages/api/categories/[id].ts", _page6],
    ["src/pages/api/categories/index.ts", _page7],
    ["src/pages/api/dna/index.ts", _page8],
    ["src/pages/api/export.ts", _page9],
    ["src/pages/api/fire/index.ts", _page10],
    ["src/pages/api/forecast/index.ts", _page11],
    ["src/pages/api/goals/[id].ts", _page12],
    ["src/pages/api/goals/index.ts", _page13],
    ["src/pages/api/health/index.ts", _page14],
    ["src/pages/api/import.ts", _page15],
    ["src/pages/api/income/[id].ts", _page16],
    ["src/pages/api/income/index.ts", _page17],
    ["src/pages/api/investments/summary.ts", _page18],
    ["src/pages/api/investments/[id].ts", _page19],
    ["src/pages/api/investments/index.ts", _page20],
    ["src/pages/api/kickoff.ts", _page21],
    ["src/pages/api/matrix/index.ts", _page22],
    ["src/pages/api/networth/[id].ts", _page23],
    ["src/pages/api/networth/index.ts", _page24],
    ["src/pages/api/recommendations.ts", _page25],
    ["src/pages/api/recurring/[id].ts", _page26],
    ["src/pages/api/recurring/index.ts", _page27],
    ["src/pages/api/recurring-breakdown.ts", _page28],
    ["src/pages/api/savings-rate.ts", _page29],
    ["src/pages/api/scenario/index.ts", _page30],
    ["src/pages/api/spending-rhythm.ts", _page31],
    ["src/pages/api/streaks.ts", _page32],
    ["src/pages/api/summaries/index.ts", _page33],
    ["src/pages/api/summary.ts", _page34],
    ["src/pages/api/transactions/[id].ts", _page35],
    ["src/pages/api/transactions/index.ts", _page36],
    ["src/pages/api/transactions-by-date.ts", _page37],
    ["src/pages/api/weekly-spending.ts", _page38],
    ["src/pages/budget.astro", _page39],
    ["src/pages/calendar.astro", _page40],
    ["src/pages/cashflow.astro", _page41],
    ["src/pages/compare.astro", _page42],
    ["src/pages/credit-card.astro", _page43],
    ["src/pages/dna.astro", _page44],
    ["src/pages/fire.astro", _page45],
    ["src/pages/forecast.astro", _page46],
    ["src/pages/goals.astro", _page47],
    ["src/pages/health.astro", _page48],
    ["src/pages/import.astro", _page49],
    ["src/pages/matrix.astro", _page50],
    ["src/pages/merchants.astro", _page51],
    ["src/pages/networth/edit.astro", _page52],
    ["src/pages/networth.astro", _page53],
    ["src/pages/portfolio.astro", _page54],
    ["src/pages/recommendations.astro", _page55],
    ["src/pages/recurring.astro", _page56],
    ["src/pages/report.astro", _page57],
    ["src/pages/savings-rate.astro", _page58],
    ["src/pages/settings.astro", _page59],
    ["src/pages/spending-mix.astro", _page60],
    ["src/pages/spending-rhythm.astro", _page61],
    ["src/pages/streaks.astro", _page62],
    ["src/pages/transactions.astro", _page63],
    ["src/pages/weekly.astro", _page64],
    ["src/pages/what-if.astro", _page65],
    ["src/pages/yearly.astro", _page66],
    ["src/pages/index.astro", _page67]
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
