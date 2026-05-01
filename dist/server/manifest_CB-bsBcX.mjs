import '@astrojs/internal-helpers/path';
import 'cookie';
import 'kleur/colors';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_kKrb6Lll.mjs';
import 'es-module-lexer';
import { n as decodeKey } from './chunks/astro/server_BVE5k6Zu.mjs';
import 'clsx';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///root/self-financial-dashboard/","adapterName":"@astrojs/node","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/node.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/add.BZUIG4EY.css"}],"routeData":{"route":"/add","isIndex":false,"type":"page","pattern":"^\\/add\\/?$","segments":[[{"content":"add","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/add.astro","pathname":"/add","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/export","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/export\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"export","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/export.ts","pathname":"/api/export","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/networth/[month]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/networth\\/([^/]+?)\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"networth","dynamic":false,"spread":false}],[{"content":"month","dynamic":true,"spread":false}]],"params":["month"],"component":"src/pages/api/networth/[month].ts","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/networth","isIndex":true,"type":"endpoint","pattern":"^\\/api\\/networth\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"networth","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/networth/index.ts","pathname":"/api/networth","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/summary","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/summary\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"summary","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/summary.ts","pathname":"/api/summary","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/transactions/[id]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/transactions\\/([^/]+?)\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"transactions","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/api/transactions/[id].ts","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/transactions","isIndex":true,"type":"endpoint","pattern":"^\\/api\\/transactions\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"transactions","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/transactions/index.ts","pathname":"/api/transactions","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/add.BZUIG4EY.css"}],"routeData":{"route":"/networth/edit","isIndex":false,"type":"page","pattern":"^\\/networth\\/edit\\/?$","segments":[[{"content":"networth","dynamic":false,"spread":false}],[{"content":"edit","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/networth/edit.astro","pathname":"/networth/edit","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/add.BZUIG4EY.css"}],"routeData":{"route":"/networth","isIndex":false,"type":"page","pattern":"^\\/networth\\/?$","segments":[[{"content":"networth","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/networth.astro","pathname":"/networth","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/add.BZUIG4EY.css"}],"routeData":{"route":"/transactions","isIndex":false,"type":"page","pattern":"^\\/transactions\\/?$","segments":[[{"content":"transactions","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/transactions.astro","pathname":"/transactions","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/add.BZUIG4EY.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/root/self-financial-dashboard/src/pages/add.astro",{"propagation":"none","containsHead":true}],["/root/self-financial-dashboard/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/root/self-financial-dashboard/src/pages/networth.astro",{"propagation":"none","containsHead":true}],["/root/self-financial-dashboard/src/pages/networth/edit.astro",{"propagation":"none","containsHead":true}],["/root/self-financial-dashboard/src/pages/transactions.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(o,t)=>{let i=async()=>{await(await o())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener(\"change\",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var l=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let a of e)if(a.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=l;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/node@_@js":"pages/_image.astro.mjs","\u0000@astro-page:src/pages/add@_@astro":"pages/add.astro.mjs","\u0000@astro-page:src/pages/api/export@_@ts":"pages/api/export.astro.mjs","\u0000@astro-page:src/pages/api/networth/[month]@_@ts":"pages/api/networth/_month_.astro.mjs","\u0000@astro-page:src/pages/api/networth/index@_@ts":"pages/api/networth.astro.mjs","\u0000@astro-page:src/pages/api/summary@_@ts":"pages/api/summary.astro.mjs","\u0000@astro-page:src/pages/api/transactions/[id]@_@ts":"pages/api/transactions/_id_.astro.mjs","\u0000@astro-page:src/pages/api/transactions/index@_@ts":"pages/api/transactions.astro.mjs","\u0000@astro-page:src/pages/networth/edit@_@astro":"pages/networth/edit.astro.mjs","\u0000@astro-page:src/pages/networth@_@astro":"pages/networth.astro.mjs","\u0000@astro-page:src/pages/transactions@_@astro":"pages/transactions.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","/root/self-financial-dashboard/node_modules/astro/dist/env/setup.js":"chunks/astro/env-setup_Cr6XTFvb.mjs","\u0000@astrojs-manifest":"manifest_CB-bsBcX.mjs","/root/self-financial-dashboard/src/components/AddTransactionForm":"_astro/AddTransactionForm.DJJowrGI.js","/root/self-financial-dashboard/src/components/AddNetworthForm":"_astro/AddNetworthForm.CoO5blSW.js","/root/self-financial-dashboard/src/components/NetworthEditForm":"_astro/NetworthEditForm.BGH7yvda.js","/root/self-financial-dashboard/src/components/NetworthTable":"_astro/NetworthTable.CH8Eur1L.js","/root/self-financial-dashboard/src/components/TransactionTable":"_astro/TransactionTable.C4DhEfkE.js","/root/self-financial-dashboard/src/components/Dashboard":"_astro/Dashboard.V7EnspGj.js","@astrojs/react/client.js":"_astro/client.Hh40YQw_.js","/root/self-financial-dashboard/src/components/NetworthChart":"_astro/NetworthChart.BHlYOCt_.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/add.BZUIG4EY.css","/_astro/AddNetworthForm.CoO5blSW.js","/_astro/AddTransactionForm.DJJowrGI.js","/_astro/Dashboard.V7EnspGj.js","/_astro/NetworthChart.BHlYOCt_.js","/_astro/NetworthChart.C-XSL64M.js","/_astro/NetworthEditForm.BGH7yvda.js","/_astro/NetworthTable.CH8Eur1L.js","/_astro/TransactionTable.C4DhEfkE.js","/_astro/badge.B2J8fJMH.js","/_astro/button.hOSqbwlC.js","/_astro/client.Hh40YQw_.js","/_astro/index.D4fpSGDK.js","/_astro/index.Jqq6-oIS.js","/_astro/label.Cwtw1JZ6.js","/_astro/select.omTbr7CM.js","/_astro/table.hyEDHEzn.js","/_astro/utils.CCbSFq1C.js","/data/monthly_summary.json","/data/networth.json","/data/transactions.json"],"buildFormat":"directory","checkOrigin":false,"serverIslandNameMap":[],"key":"aEB7dQ7F3sOQifxqgNzpjhDo7rLtcN+upAW9rVnOCQc=","experimentalEnvGetSecretEnabled":false});

export { manifest };
