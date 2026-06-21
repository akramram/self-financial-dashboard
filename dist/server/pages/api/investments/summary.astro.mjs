import { J as getPortfolioSummary } from '../../../chunks/db_DFS0dPqt.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async () => {
  const summary = getPortfolioSummary();
  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
