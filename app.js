/* =========================================================
   Prato Amarrado — lógica do aplicativo
   ========================================================= */

const STORAGE_KEY = "prato.v1";
const CHAT_API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:4173" : "";
const APP_ROUTES = ["meu-dia", "receitas", "semana", "compras"];
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const GOAL_OPTIONS = ["Emagrecimento saudável", "Manutenção", "Ganho de massa", "Mais energia no dia a dia"];

const ui = {
  route: getRoute(),
  selectedDate: localISO(new Date()),
  filter: "all",
  search: "",
  shoppingScope: "week"
};

let state = loadState();
let lastFocused = null;
let resetConfirmTimer = null;

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

const chatFab = document.getElementById("chat-fab");
const chatPanel = document.getElementById("chat-panel");
const chatMessages = document.getElementById("chat-messages");
const chatContext = document.getElementById("chat-context");
const chatQuick = document.getElementById("chat-quick");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatFabBadge = document.querySelector(".chat-fab-badge");
const chatPhoto = document.getElementById("chat-photo");
const chatPhotoInput = document.getElementById("chat-photo-input");
const chatAttachment = document.getElementById("chat-attachment");
const chatAttachmentPreview = document.getElementById("chat-attachment-preview");
const chatMic = document.getElementById("chat-mic");
const chatMicLabel = document.getElementById("chat-mic-label");

const chatState = {
  open: false,
  initialized: false,
  messages: [],
  quickReplies: [],
  typing: false,
  session: {},
  topic: null,
  requestSeq: 0,
  apiAbort: null,
  pendingPhoto: null,
  photoProcessing: false,
  voiceListening: false,
  voiceBase: "",
  recognition: null
};

const chatBackend = {
  status: "unknown",
  configured: false,
  available: false,
  model: null,
  fallbackNotified: false
};

let chatBackendPromise = null;

const CHAT_ROUTE_META = {
  "meu-dia": { label: "Abrir meu dia", icon: "home" },
  "receitas": { label: "Abrir receitas", icon: "book" },
  "semana": { label: "Abrir plano semanal", icon: "calendar" },
  "compras": { label: "Abrir lista de compras", icon: "bag" }
};

/* =========================================================
   Datas e utilidades
   ========================================================= */

function localISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayIso() {
  return localISO(new Date());
}

function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(iso, amount) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + amount);
  return localISO(d);
}

function isToday(iso) {
  return iso === todayIso();
}

function weekdayIndex(iso) {
  return (parseIso(iso).getDay() + 6) % 7;
}

function weekDates(anchorIso) {
  const start = addDays(anchorIso, -weekdayIndex(anchorIso));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function weekdayLong(iso, cap = false) {
  const value = WEEKDAYS[parseIso(iso).getDay()];
  return cap ? capitalize(value) : value;
}

function weekdayShort(iso, cap = false) {
  const value = WEEKDAYS_SHORT[parseIso(iso).getDay()];
  return cap ? capitalize(value) : value;
}

function dateLong(iso) {
  const d = parseIso(iso);
  return `${weekdayLong(iso)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function dateShort(iso) {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function dateNavLabel(iso) {
  if (isToday(iso)) return `Hoje, ${dateShort(iso)}`;
  return `${weekdayShort(iso, true)}, ${dateShort(iso)}`;
}

function rangeLabel(startIso, endIso) {
  const a = parseIso(startIso);
  const b = parseIso(endIso);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} de ${MONTHS[a.getMonth()]}`;
  }
  return `${a.getDate()} de ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} de ${MONTHS_SHORT[b.getMonth()]}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("pt-BR");
}

function formatQty(qty) {
  if (!qty) return "";
  if (qty === 0.25) return "¼";
  if (qty === 0.5) return "½";
  if (qty === 0.75) return "¾";
  if (Number.isInteger(qty)) return String(qty);
  return qty.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

const UNIT_CANONICAL = {
  fatia: "fatia",
  fatias: "fatia",
  punhado: "punhado",
  punhados: "punhado",
  dente: "dente",
  dentes: "dente"
};

function canonicalUnit(unit) {
  return UNIT_CANONICAL[unit] || unit;
}

function displayUnit(unit, qty) {
  const base = canonicalUnit(unit);
  if (qty === 1) return base;
  if (["fatia", "punhado", "dente"].includes(base)) return `${base}s`;
  return base;
}

function qtyLabel(ingredient) {
  if (!ingredient.qty) return ingredient.unit || "";
  return `${formatQty(ingredient.qty)} ${displayUnit(ingredient.unit, ingredient.qty)}`.trim();
}

function icon(name, className = "") {
  return `<svg class="icon ${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function firstNameOf(name) {
  return String(name).trim().split(/\s+/)[0] || "Marina";
}

function getRecipe(id) {
  return RECIPES.find((recipe) => recipe.id === id) || null;
}

function recipeOptions(mealId) {
  return RECIPES.filter((recipe) => recipe.meal === mealId);
}

function mealById(id) {
  return MEALS.find((meal) => meal.id === id) || MEALS[0];
}

function getRoute() {
  const route = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return APP_ROUTES.includes(route) ? route : "meu-dia";
}

function navigate(route) {
  const next = `#/${route}`;
  if (window.location.hash === next) {
    renderRoute({ scrollTop: false });
  } else {
    window.location.hash = next;
  }
}

/* =========================================================
   Estado / persistência
   ========================================================= */

function freshState(seed = true) {
  const next = {
    version: 1,
    profile: { ...DEFAULT_PROFILE },
    favorites: [],
    plans: {},
    water: {},
    done: {},
    checkedShopping: [],
    customShopping: []
  };
  if (seed) next.water[todayIso()] = 3;
  return next;
}

function normalizeState(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  return {
    version: 1,
    profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
    favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((id) => getRecipe(id)) : [],
    plans: parsed.plans && typeof parsed.plans === "object" ? parsed.plans : {},
    water: parsed.water && typeof parsed.water === "object" ? parsed.water : {},
    done: parsed.done && typeof parsed.done === "object" ? parsed.done : {},
    checkedShopping: Array.isArray(parsed.checkedShopping) ? parsed.checkedShopping : [],
    customShopping: Array.isArray(parsed.customShopping) ? parsed.customShopping : []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = freshState(true);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); } catch (_) { /* modo privado */ }
      return initial;
    }
    const parsed = JSON.parse(raw);
    return normalizeState(parsed) || freshState(true);
  } catch (_) {
    return freshState(true);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    /* O app continua funcionando em memória quando o armazenamento não está disponível. */
  }
}

function planFor(iso) {
  const stored = state.plans[iso];
  const template = WEEK_TEMPLATES[weekdayIndex(iso)] || WEEK_TEMPLATES[0];
  const candidate = stored && typeof stored === "object" ? stored : template;
  const result = {};
  MEALS.forEach((meal) => {
    const recipe = getRecipe(candidate[meal.id]);
    result[meal.id] = recipe ? recipe.id : template[meal.id];
  });
  return result;
}

function planRecipes(iso) {
  const plan = planFor(iso);
  return MEALS.map((meal) => ({
    meal,
    recipe: getRecipe(plan[meal.id])
  })).filter((entry) => entry.recipe);
}

function nutritionForRecipes(recipes) {
  return recipes.reduce((acc, recipe) => {
    acc.kcal += recipe.kcal;
    acc.protein += recipe.protein;
    acc.carbs += recipe.carbs;
    acc.fat += recipe.fat;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

function nutritionForPlan(iso) {
  return nutritionForRecipes(planRecipes(iso).map((entry) => entry.recipe));
}

function setRecipeForMeal(iso, mealId, recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe || !MEALS.some((meal) => meal.id === mealId)) return false;
  state.plans[iso] = { ...planFor(iso), [mealId]: recipeId };
  saveState();
  return true;
}

function toggleFavorite(recipeId) {
  const index = state.favorites.indexOf(recipeId);
  if (index >= 0) state.favorites.splice(index, 1);
  else state.favorites.push(recipeId);
  saveState();

  const isFav = state.favorites.includes(recipeId);
  document.querySelectorAll(`[data-fav="${recipeId}"]`).forEach((button) => {
    button.classList.toggle("is-fav", isFav);
    button.setAttribute("aria-pressed", String(isFav));
    button.setAttribute("aria-label", isFav ? "Remover dos favoritos" : "Adicionar aos favoritos");
  });

  if (ui.route === "receitas" && ui.filter === "favoritas") updateRecipeGrid();
  showToast(isFav ? "Receita salva nos seus favoritos." : "Receita removida dos favoritos.", isFav ? "heart" : "check");
}

function isFavorite(recipeId) {
  return state.favorites.includes(recipeId);
}

/* =========================================================
   Chrome / navegação
   ========================================================= */

function syncChrome() {
  ui.route = getRoute();

  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === ui.route;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const name = state.profile.name || "Marina Costa";
  document.querySelectorAll("[data-avatar]").forEach((avatar) => {
    avatar.textContent = initials(name);
  });
  document.querySelectorAll("[data-profile-name]").forEach((el) => {
    el.textContent = name;
  });
  document.querySelectorAll("[data-profile-goal]").forEach((el) => {
    el.textContent = state.profile.goalLabel;
  });
  document.querySelectorAll("#profile-top, #profile-sidebar").forEach((button) => {
    button.setAttribute("aria-label", `Abrir perfil de ${name}`);
  });

  const badge = document.getElementById("nav-shopping-badge");
  if (badge) {
    const shopping = getShoppingData("week");
    const pending = Math.max(0, shopping.total - shopping.checked);
    badge.hidden = pending === 0;
    badge.textContent = pending > 99 ? "99+" : String(pending);
    badge.setAttribute("aria-label", `${pending} itens pendentes na lista de compras`);
  }

  if (chatState.open) updateChatContext();
}

function renderRoute({ scrollTop = false } = {}) {
  ui.route = getRoute();
  closeModal();

  if (ui.route === "meu-dia") renderDashboard();
  else if (ui.route === "receitas") renderRecipesPage();
  else if (ui.route === "semana") renderWeekPage();
  else renderShoppingPage();

  syncChrome();
  if (scrollTop) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function refreshCurrentRoute({ keepScroll = true } = {}) {
  const y = window.scrollY;
  renderRoute({ scrollTop: false });
  if (keepScroll) requestAnimationFrame(() => window.scrollTo(0, y));
}

function refreshDashboard({ keepScroll = true } = {}) {
  const y = window.scrollY;
  renderDashboard();
  syncChrome();
  if (keepScroll) requestAnimationFrame(() => window.scrollTo(0, y));
}

/* =========================================================
   Página — Meu dia
   ========================================================= */

function renderDashboard() {
  const iso = ui.selectedDate;
  const entries = planRecipes(iso);
  const totals = nutritionForPlan(iso);
  const goal = state.profile;
  const caloriePct = Math.round((totals.kcal / goal.calories) * 100);
  const remaining = Math.round(goal.calories - totals.kcal);
  const doneCount = MEALS.filter((meal) => Boolean(state.done[iso] && state.done[iso][meal.id])).length;
  const today = isToday(iso);

  app.innerHTML = `
    <div class="page dashboard-page">
      <header class="page-head">
        <div>
          <div class="eyebrow">${today ? "Hoje" : "Plano do dia"} · ${escapeHTML(dateLong(iso))}</div>
          <h1>${greeting()}, <em>${escapeHTML(firstNameOf(goal.name))}.</em></h1>
          <p>${dashboardSubtitle(iso, entries.length, doneCount)}</p>
        </div>
        <div class="page-head-side">${renderDateNav(iso)}</div>
      </header>

      <div class="dashboard-grid">
        <div class="dashboard-main">
          ${renderHero(totals, caloriePct, remaining, entries.length, goal)}
          <section class="meals-section" aria-labelledby="meals-title">
            <div class="section-head">
              <h2 id="meals-title">Seu cardápio de hoje</h2>
              <a class="text-link" href="#/semana">Ver plano semanal ${icon("arrow-right")}</a>
            </div>
            <div class="meal-list">
              ${entries.map(({ meal, recipe }) => renderMealCard(meal, recipe, iso)).join("")}
            </div>
            ${renderDayNote(remaining, totals, caloriePct)}
          </section>
        </div>

        <aside class="dashboard-rail" aria-label="Resumo e dicas do dia">
          ${renderWaterCard(iso)}
          ${renderWeekPeek(iso)}
          ${renderTipCard(iso)}
        </aside>
      </div>
    </div>
  `;

  const ring = app.querySelector(".ring-progress");
  if (ring) {
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = ring.dataset.offset || "0";
    });
  }
}

function dashboardSubtitle(iso, mealCount, doneCount) {
  if (doneCount === mealCount && mealCount > 0) {
    return "Todas as refeições de hoje estão registradas. Que dia bem cuidado.";
  }
  if (!isToday(iso)) {
    return `Um cardápio montado para ${weekdayLong(iso)}. Troque qualquer refeição quando quiser.`;
  }
  if (doneCount > 0) {
    return `${doneCount} de ${mealCount} refeições já registradas. Ajuste o restante no seu tempo.`;
  }
  return "Seu dia já está desenhado. Troque qualquer receita quando a vontade mudar.";
}

function renderDateNav(iso) {
  return `
    <div class="date-nav" aria-label="Navegar entre os dias">
      <button class="date-nav-btn" type="button" data-date-prev aria-label="Dia anterior">
        ${icon("arrow-left")}
      </button>
      <div class="date-nav-label" aria-live="polite" title="${escapeHTML(capitalize(dateLong(iso)))}">
        ${escapeHTML(dateNavLabel(iso))}
      </div>
      <button class="date-nav-btn" type="button" data-date-next aria-label="Próximo dia">
        ${icon("arrow-right")}
      </button>
      ${isToday(iso) ? "" : `<button class="date-today-link" type="button" data-date-today>Voltar para hoje</button>`}
    </div>
  `;
}

function renderHero(totals, pct, remaining, mealCount, profile) {
  const visualPct = clamp(pct, 0, 100);
  const ringOffset = (358.14 * (1 - visualPct / 100)).toFixed(2);
  const headline = heroHeadline(pct);
  const macro = (value, goal) => `${Math.round((value / Math.max(goal, 1)) * 100)}%`;

  return `
    <section class="hero-card" aria-labelledby="hero-title">
      <div class="hero-copy">
        <div class="hero-kicker">Plano de hoje</div>
        <h2 id="hero-title">${headline}</h2>
        <p>${heroDescription(pct, remaining)}</p>
        <div class="hero-stats">
          <div class="hero-stat"><strong>${mealCount}</strong><span>refeições</span></div>
          <div class="hero-stat"><strong>${formatNumber(totals.kcal)}</strong><span>kcal <span class="stat-extra">planejadas</span></span></div>
          <div class="hero-stat"><strong>${formatNumber(totals.protein)} g</strong><span>de proteína</span></div>
        </div>
      </div>

      <div class="hero-ring-wrap">
        <div class="hero-ring" role="img" aria-label="${formatNumber(totals.kcal)} de ${formatNumber(profile.calories)} quilocalorias planejadas, ${pct}% da meta">
          <svg viewBox="0 0 140 140" aria-hidden="true">
            <circle class="ring-track" cx="70" cy="70" r="57"></circle>
            <circle class="ring-progress" cx="70" cy="70" r="57" style="stroke-dashoffset:358.14" data-offset="${ringOffset}"></circle>
          </svg>
          <div class="hero-ring-label">
            <strong>${formatNumber(totals.kcal)}</strong>
            <span>de ${formatNumber(profile.calories)} kcal</span>
          </div>
        </div>
      </div>

      <div class="hero-macros" aria-label="Distribuição de macronutrientes">
        <div class="macro macro-protein">
          <div class="macro-head"><span>Proteína</span><strong>${totals.protein} / ${profile.protein} g</strong></div>
          <div class="macro-bar"><span style="width:${clamp(macro(totals.protein, profile.protein).replace("%", ""), 0, 100)}%"></span></div>
        </div>
        <div class="macro macro-carbs">
          <div class="macro-head"><span>Carboidratos</span><strong>${totals.carbs} / ${profile.carbs} g</strong></div>
          <div class="macro-bar"><span style="width:${clamp(macro(totals.carbs, profile.carbs).replace("%", ""), 0, 100)}%"></span></div>
        </div>
        <div class="macro macro-fat">
          <div class="macro-head"><span>Gorduras</span><strong>${totals.fat} / ${profile.fat} g</strong></div>
          <div class="macro-bar"><span style="width:${clamp(macro(totals.fat, profile.fat).replace("%", ""), 0, 100)}%"></span></div>
        </div>
      </div>
    </section>
  `;
}

function heroHeadline(pct) {
  if (pct > 105) return 'Um dia para <em>flexibilizar.</em>';
  if (pct >= 97) return 'Na medida <em>certa.</em>';
  if (pct >= 88) return 'Quase tudo <em>no lugar.</em>';
  if (pct >= 75) return 'Um dia leve, <em>do seu jeito.</em>';
  return 'Ainda dá tempo <em>de ajustar.</em>';
}

function heroDescription(pct, remaining) {
  if (remaining < -30) {
    return `Seu cardápio soma ${pct}% da meta. Passou ${Math.abs(remaining)} kcal — dá para ajustar trocando uma refeição.`;
  }
  if (remaining < 30) {
    return `Seu cardápio fecha o dia dentro da meta, com ${Math.max(0, remaining)} kcal de margem.`;
  }
  return `Seu cardápio cobre ${pct}% da meta. Ainda sobram ${remaining} kcal para o que vier.`;
}

function renderMealCard(meal, recipe, iso) {
  const done = Boolean(state.done[iso] && state.done[iso][meal.id]);
  return `
    <article class="meal-card ${done ? "is-done" : ""}" data-meal-card="${meal.id}">
      <div class="meal-time">
        <strong>${meal.time}</strong>
        <span class="meal-dot tone-${meal.tone}" aria-hidden="true"></span>
      </div>

      <button class="meal-photo" type="button" data-open-recipe="${recipe.id}" data-meal="${meal.id}" aria-label="Ver receita ${escapeHTML(recipe.title)}">
        <img src="${recipe.image}" alt="" loading="lazy">
      </button>

      <div class="meal-info">
        <div class="meal-kicker">${meal.name}<span class="time-mobile"> · ${meal.time}</span></div>
        <button class="meal-title" type="button" data-open-recipe="${recipe.id}" data-meal="${meal.id}">${escapeHTML(recipe.title)}</button>
        <p class="meal-sub">${escapeHTML(recipe.subtitle)}</p>
        <div class="meal-meta">
          <span><strong>${formatNumber(recipe.kcal)}</strong> kcal</span>
          <span><strong>${recipe.protein} g</strong> proteína</span>
          <span>${recipe.time} min</span>
        </div>
      </div>

      <div class="meal-side">
        <button class="btn-swap" type="button" data-swap="${meal.id}">
          ${icon("swap")} Trocar
        </button>
        <button class="done-toggle ${done ? "is-done" : ""}" type="button" data-done="${meal.id}" aria-pressed="${done}">
          <span class="done-check">${icon("check")}</span>
          <span data-done-label>${done ? "Feita" : "Marcar feita"}</span>
        </button>
      </div>
    </article>
  `;
}

function renderDayNote(remaining, totals, pct) {
  if (remaining < -30) {
    return `
      <div class="dashboard-note">
        ${icon("info")}
        <span><strong>${Math.abs(remaining)} kcal acima da meta.</strong> Trocar uma refeição por outra opção ajusta o dia automaticamente.</span>
      </div>
    `;
  }
  if (remaining <= 30) {
    return `
      <div class="dashboard-note">
        ${icon("sparkle")}
        <span><strong>Dia equilibrado.</strong> Você está a ${Math.max(0, remaining)} kcal da meta — sem precisar cortar nada.</span>
      </div>
    `;
  }
  return `
    <div class="dashboard-note">
      ${icon("info")}
      <span><strong>${remaining} kcal de margem.</strong> Cabe uma fruta, um café extra ou uma porção um pouco maior. ${pct}% da meta já está coberto.</span>
    </div>
  `;
}

function renderWaterCard(iso) {
  const water = clamp(Number(state.water[iso] || 0), 0, state.profile.waterGoal);
  const goal = state.profile.waterGoal;
  const remaining = Math.max(0, goal - water);
  const mlRemaining = remaining * 250;
  const done = water >= goal;

  return `
    <section class="rail-card water-card" aria-labelledby="water-title">
      <div class="water-head">
        <div class="rail-title" id="water-title">${icon("drop")} Hidratação</div>
        <span class="water-count"><strong id="water-count">${water}</strong><span>/ ${goal} copos</span></span>
      </div>

      <div class="water-glasses" role="group" aria-label="Registrar copos de água">
        ${Array.from({ length: goal }, (_, index) => {
          const filled = index < water;
          return `<button class="water-glass ${filled ? "is-filled" : ""}" type="button" data-water="${index + 1}" aria-label="Registrar ${index + 1} ${index === 0 ? "copo" : "copos"} de água" aria-pressed="${filled}"><span class="glass-shape" aria-hidden="true"></span></button>`;
        }).join("")}
      </div>

      <div class="water-foot">
        <p id="water-foot-text">${done ? "Meta de hoje concluída. Continue assim." : `Faltam ${remaining} ${remaining === 1 ? "copo" : "copos"} · ${formatNumber(mlRemaining)} ml`}</p>
        <button class="water-add" type="button" data-water-add>
          ${icon(done ? "check" : "plus")} ${done ? "Meta" : "+ 250 ml"}
        </button>
      </div>
    </section>
  `;
}

function updateWaterCard() {
  const current = document.querySelector(".water-card");
  if (!current) return;
  current.outerHTML = renderWaterCard(ui.selectedDate);
}

function renderWeekPeek(iso) {
  const days = weekDates(iso);
  const average = Math.round(days.reduce((sum, day) => sum + nutritionForPlan(day).kcal, 0) / days.length);

  return `
    <section class="rail-card" aria-labelledby="week-peek-title">
      <div class="week-peek-head">
        <div class="rail-title" id="week-peek-title">${icon("calendar")} Sua semana</div>
        <a class="text-link" href="#/semana">Ver plano ${icon("arrow-right")}</a>
      </div>
      <div class="week-peek-list">
        ${days.map((day) => {
          const nutrition = nutritionForPlan(day);
          const pct = clamp((nutrition.kcal / state.profile.calories) * 100, 8, 100);
          return `
            <button class="week-peek-row ${isToday(day) ? "is-today" : ""}" type="button" data-go-date="${day}" aria-label="${escapeHTML(capitalize(dateLong(day)))}: ${formatNumber(nutrition.kcal)} quilocalorias">
              <span class="week-peek-day">${weekdayShort(day)}</span>
              <span class="week-peek-bar"><span style="width:${pct}%"></span></span>
              <span class="week-peek-kcal">${formatNumber(nutrition.kcal)}</span>
            </button>
          `;
        }).join("")}
      </div>
      <div class="week-peek-foot">Média da semana: <strong>${formatNumber(average)} kcal</strong> · meta ${formatNumber(state.profile.calories)} kcal</div>
    </section>
  `;
}

function renderTipCard(iso) {
  const tip = NUTRI_TIPS[weekdayIndex(iso) % NUTRI_TIPS.length];
  return `
    <article class="rail-card tip-card" aria-labelledby="tip-title">
      <div class="tip-label">${icon("sparkle")} Dica da nutri</div>
      <h3 id="tip-title">${tip.title}</h3>
      <p>${tip.text}</p>
      <button class="tip-action" type="button" data-tip-filter="${tip.filter}">
        ${tip.action} ${icon("arrow-up-right")}
      </button>
    </article>
  `;
}

/* =========================================================
   Página — Receitas
   ========================================================= */

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "cafe", label: "Café da manhã" },
  { id: "almoco", label: "Almoço" },
  { id: "lanche", label: "Lanches" },
  { id: "jantar", label: "Jantar" },
  { id: "favoritas", label: "Favoritas" }
];

function renderRecipesPage() {
  app.innerHTML = `
    <div class="page recipes-page">
      <header class="page-head">
        <div>
          <div class="eyebrow">Biblioteca de receitas</div>
          <h1>Receitas para <em>todo dia.</em></h1>
          <p>Ideias que cabem na sua rotina e no seu plano. Filtre por refeição, busque por ingrediente e troque o cardápio sem complicação.</p>
        </div>
      </header>

      <div class="library-toolbar">
        <label class="search-field">
          <span class="sr-only">Buscar receitas</span>
          ${icon("search")}
          <input type="search" id="recipe-search" value="${escapeHTML(ui.search)}" placeholder="Busque por receita ou ingrediente" autocomplete="off">
        </label>

        <div class="filter-row" role="group" aria-label="Filtrar receitas">
          ${FILTERS.map((filter) => `
            <button class="chip ${ui.filter === filter.id ? "active" : ""}" type="button" data-filter="${filter.id}" aria-pressed="${ui.filter === filter.id}">
              ${filter.id === "favoritas" ? icon("heart") : ""}${filter.label}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="library-sub">
        <span><strong id="library-result-count">${filteredRecipes().length}</strong> <span id="library-result-word">${filteredRecipes().length === 1 ? "receita" : "receitas"}</span> para explorar</span>
        <span id="library-result-context">${filterContextLabel()}</span>
      </div>

      <div class="recipe-grid" id="recipe-grid">
        ${renderRecipeGrid(filteredRecipes())}
      </div>
    </div>
  `;

  const search = document.getElementById("recipe-search");
  if (search) {
    search.addEventListener("input", (event) => {
      ui.search = event.target.value;
      updateRecipeGrid();
    });
  }

  if (ui.search) {
    requestAnimationFrame(() => {
      document.getElementById("recipe-search")?.focus({ preventScroll: true });
    });
  }
}

function filteredRecipes() {
  const query = normalizeText(ui.search);
  return RECIPES.filter((recipe) => {
    if (ui.filter === "favoritas" && !isFavorite(recipe.id)) return false;
    if (ui.filter !== "all" && ui.filter !== "favoritas" && recipe.meal !== ui.filter) return false;
    if (!query) return true;

    const haystack = normalizeText([
      recipe.title,
      recipe.subtitle,
      recipe.category,
      recipe.tags.join(" "),
      recipe.ingredients.map((ingredient) => ingredient.name).join(" ")
    ].join(" "));
    return haystack.includes(query);
  });
}

function filterContextLabel() {
  if (ui.search.trim()) return "Resultado da sua busca";
  const filter = FILTERS.find((item) => item.id === ui.filter);
  return filter ? filter.label : "Todas";
}

function renderRecipeGrid(recipes) {
  if (!recipes.length) {
    const isFavorites = ui.filter === "favoritas" && !ui.search.trim();
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon(isFavorites ? "heart" : "search")}</div>
        <h3>${isFavorites ? "Nenhuma favorita ainda." : "Nada por aqui."}</h3>
        <p>${isFavorites
          ? "Toque no coração de uma receita para guardar suas ideias favoritas neste espaço."
          : "Não encontramos receitas com esses termos. Tente outro ingrediente ou veja todas as opções."}</p>
        <button class="btn btn-soft" type="button" data-filter="all">Ver todas as receitas</button>
      </div>
    `;
  }

  return recipes.map(renderRecipeCard).join("");
}

function renderRecipeCard(recipe) {
  const fav = isFavorite(recipe.id);
  return `
    <article class="recipe-card">
      <div class="recipe-media">
        <img src="${recipe.image}" alt="${escapeHTML(recipe.title)}" loading="lazy">
        <span class="recipe-badge">${recipe.category}</span>
        <button class="fav-btn ${fav ? "is-fav" : ""}" type="button" data-fav="${recipe.id}" aria-label="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}" aria-pressed="${fav}">
          ${icon("heart")}
        </button>
      </div>
      <div class="recipe-body">
        <div class="recipe-topline">
          ${icon("clock")} ${recipe.time} min
          <span class="sep" aria-hidden="true"></span>
          ${formatNumber(recipe.kcal)} kcal
          <span class="sep" aria-hidden="true"></span>
          ${recipe.difficulty}
        </div>
        <h3><button class="recipe-title-btn" type="button" data-open-recipe="${recipe.id}">${escapeHTML(recipe.title)}</button></h3>
        <p>${escapeHTML(recipe.subtitle)}</p>
        <div class="recipe-foot">
          <span class="protein-tag">${icon("flame")} ${recipe.protein} g de proteína</span>
          <button class="round-arrow" type="button" data-open-recipe="${recipe.id}" aria-label="Abrir receita ${escapeHTML(recipe.title)}">
            ${icon("arrow-up-right")}
          </button>
        </div>
      </div>
    </article>
  `;
}

function updateRecipeGrid() {
  const recipes = filteredRecipes();
  const grid = document.getElementById("recipe-grid");
  if (!grid) return;
  grid.innerHTML = renderRecipeGrid(recipes);

  const count = document.getElementById("library-result-count");
  const word = document.getElementById("library-result-word");
  const context = document.getElementById("library-result-context");
  if (count) count.textContent = String(recipes.length);
  if (word) word.textContent = recipes.length === 1 ? "receita" : "receitas";
  if (context) context.textContent = filterContextLabel();

  document.querySelectorAll("[data-filter]").forEach((button) => {
    const active = button.dataset.filter === ui.filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

/* =========================================================
   Página — Plano semanal
   ========================================================= */

function renderWeekPage() {
  const days = weekDates(ui.selectedDate);
  const weekPlans = days.map((iso) => ({ iso, entries: planRecipes(iso), nutrition: nutritionForPlan(iso) }));
  const average = Math.round(weekPlans.reduce((sum, day) => sum + day.nutrition.kcal, 0) / days.length);
  const averagePct = Math.round((average / state.profile.calories) * 100);
  const uniqueRecipes = new Set(weekPlans.flatMap((day) => day.entries.map((entry) => entry.recipe.id))).size;
  const maxKcal = Math.max(...weekPlans.map((day) => day.nutrition.kcal), state.profile.calories);

  app.innerHTML = `
    <div class="page week-page">
      <header class="page-head">
        <div>
          <div class="eyebrow">Plano semanal</div>
          <h1>Sua semana, <em>em equilíbrio.</em></h1>
          <p>Sete dias de refeições que conversam entre si e com a sua rotina. Abra um dia para ver os detalhes ou troque o cardápio inteiro de uma vez.</p>
        </div>
        <div class="page-head-side">
          <a class="btn btn-light" href="#/compras">${icon("bag")} Lista da semana</a>
        </div>
      </header>

      <section class="week-summary" aria-labelledby="week-summary-title">
        <div>
          <div class="eyebrow">${escapeHTML(rangeLabel(days[0], days[6]))}</div>
          <h2 id="week-summary-title">Uma semana com <em>ritmo.</em></h2>
          <p>Cardápio montado para variar sabores sem perder o fio da meta. As porções são ajustáveis e cada troca recalcula o dia na hora.</p>
          <div class="week-stats">
            <div class="week-stat"><strong>${formatNumber(average)}</strong><span>média diária · kcal</span></div>
            <div class="week-stat"><strong>${averagePct}%</strong><span>da meta diária</span></div>
            <div class="week-stat"><strong>${uniqueRecipes}</strong><span>receitas diferentes</span></div>
          </div>
        </div>

        <div class="week-chart-wrap">
          <div class="week-chart" aria-label="Calorias planejadas por dia da semana">
            ${weekPlans.map(({ iso, nutrition }) => {
              const height = Math.max(24, Math.round((nutrition.kcal / maxKcal) * 100));
              return `
                <div class="week-bar-col ${isToday(iso) ? "is-today" : ""}" title="${escapeHTML(capitalize(dateLong(iso)))}: ${formatNumber(nutrition.kcal)} kcal">
                  <div class="week-bar-track"><div class="week-bar" style="height:${height}%"></div></div>
                  <span>${weekdayShort(iso).slice(0, 3)}</span>
                </div>
              `;
            }).join("")}
          </div>
          <div class="week-chart-foot">
            <span>Média de ${averagePct}% da meta</span>
            <button class="btn-randomize" type="button" data-randomize>${icon("swap")} Variar cardápio</button>
          </div>
        </div>
      </section>

      <div class="week-grid">
        ${weekPlans.map(({ iso, entries, nutrition }) => renderWeekDayCard(iso, entries, nutrition)).join("")}
      </div>

      <p class="week-disclaimer">
        ${icon("info")}
        <span>Calorias e macronutrientes são estimativas por porção. O plano é uma sugestão e deve ser adaptado ao seu contexto e às suas preferências.</span>
      </p>
    </div>
  `;
}

function renderWeekDayCard(iso, entries, nutrition) {
  const pct = Math.round((nutrition.kcal / state.profile.calories) * 100);
  return `
    <article class="week-day-card ${isToday(iso) ? "is-today" : ""}">
      <div class="week-day-head">
        <div>
          <div class="week-day-name">${weekdayLong(iso, true)}</div>
          <div class="week-day-date">${dateShort(iso)}</div>
        </div>
        ${isToday(iso) ? '<span class="today-pill">Hoje</span>' : ""}
      </div>

      <div class="week-day-energy">
        <strong>${formatNumber(nutrition.kcal)}</strong><span>kcal</span>
        <em>${pct}% da meta</em>
      </div>
      <div class="week-day-progress"><span style="width:${clamp(pct, 4, 100)}%"></span></div>

      <div class="week-day-meals">
        ${entries.map(({ meal, recipe }) => `
          <div class="week-meal-row">
            <span class="meal-dot tone-${meal.tone}" aria-hidden="true"></span>
            <span class="week-meal-name" title="${escapeHTML(recipe.title)}">${escapeHTML(recipe.title)}</span>
            <span class="week-meal-kcal">${formatNumber(recipe.kcal)}</span>
          </div>
        `).join("")}
      </div>

      <button class="week-day-open" type="button" data-open-day="${iso}">
        Abrir cardápio ${icon("arrow-right")}
      </button>
    </article>
  `;
}

function randomizeWeek() {
  const days = weekDates(ui.selectedDate);
  days.forEach((iso) => {
    const current = planFor(iso);
    const next = {};
    MEALS.forEach((meal) => {
      const options = recipeOptions(meal.id).filter((recipe) => recipe.id !== current[meal.id]);
      next[meal.id] = options[Math.floor(Math.random() * options.length)]?.id || current[meal.id];
    });
    state.plans[iso] = next;
  });
  saveState();
  refreshCurrentRoute({ keepScroll: true });
  showToast("Novo cardápio gerado para a semana.", "sparkle");
}

/* =========================================================
   Página — Lista de compras
   ========================================================= */

function getShoppingData(scope = ui.shoppingScope) {
  const dates = scope === "week" ? weekDates(ui.selectedDate) : [ui.selectedDate];
  const recipes = dates.flatMap((iso) => planRecipes(iso).map((entry) => entry.recipe));
  const map = new Map();

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const unit = canonicalUnit(ingredient.unit);
      const key = `r:${normalizeText(ingredient.name)}|${unit}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          kind: "recipe",
          name: ingredient.name,
          unit,
          qty: 0,
          aisle: ingredient.aisle
        });
      }
      const item = map.get(key);
      if (ingredient.qty) item.qty += ingredient.qty;
    });
  });

  const groups = AISLES.map((aisle) => ({
    name: aisle,
    items: [...map.values()]
      .filter((item) => item.aisle === aisle)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  })).filter((group) => group.items.length);

  const manual = state.customShopping
    .filter((item) => item.scope === scope)
    .map((item) => ({
      key: `m:${item.id}`,
      kind: "manual",
      id: item.id,
      name: item.name,
      unit: "",
      qty: 0,
      aisle: "Outros"
    }));

  if (manual.length) groups.push({ name: "Outros", items: manual });

  const allItems = groups.flatMap((group) => group.items);
  allItems.forEach((item) => {
    item.scopeKey = `${scope}:${item.key}`;
  });
  const checkedSet = new Set(state.checkedShopping);
  const checked = allItems.filter((item) => checkedSet.has(item.scopeKey)).length;

  return {
    scope,
    groups,
    total: allItems.length,
    checked
  };
}

function renderShoppingPage() {
  const data = getShoppingData(ui.shoppingScope);
  const percent = data.total ? Math.round((data.checked / data.total) * 100) : 0;
  const days = weekDates(ui.selectedDate);
  const scopeLabel = ui.shoppingScope === "week"
    ? rangeLabel(days[0], days[6])
    : capitalize(dateLong(ui.selectedDate));

  app.innerHTML = `
    <div class="page shopping-page">
      <header class="page-head">
        <div>
          <div class="eyebrow">Lista de compras</div>
          <h1>Tudo o que você precisa, <em>em uma lista.</em></h1>
          <p>Reunimos os ingredientes do seu plano com as quantidades já somadas. Marque o que já está na sacola e leve o resto com você.</p>
        </div>
      </header>

      <section class="shopping-summary" aria-labelledby="shopping-summary-title">
        <div class="shopping-icon">${icon("cart")}</div>
        <div class="shopping-summary-copy">
          <h2 id="shopping-summary-title">${ui.shoppingScope === "week" ? "Sua lista da semana" : "Sua lista de hoje"}</h2>
          <p id="shopping-progress-count">${data.checked} de ${data.total} itens comprados · ${escapeHTML(scopeLabel)}</p>
          <div class="shopping-progress-line">
            <div class="shopping-progress-bar" id="shopping-progress-bar"><span style="width:${percent}%"></span></div>
            <strong id="shopping-progress-percent">${percent}%</strong>
          </div>
        </div>
        <div class="shopping-summary-actions">
          <div class="scope-switch" role="group" aria-label="Período da lista">
            <button class="scope-btn ${ui.shoppingScope === "week" ? "active" : ""}" type="button" data-scope="week" aria-pressed="${ui.shoppingScope === "week"}">Semana</button>
            <button class="scope-btn ${ui.shoppingScope === "day" ? "active" : ""}" type="button" data-scope="day" aria-pressed="${ui.shoppingScope === "day"}">Hoje</button>
          </div>
          <button class="btn btn-soft" type="button" data-mark-all>
            ${icon(data.checked === data.total && data.total ? "x" : "check")}
            ${data.checked === data.total && data.total ? "Desmarcar" : "Marcar todos"}
          </button>
        </div>
      </section>

      <div class="shopping-layout">
        <section class="shopping-panel" aria-labelledby="shopping-list-title">
          <div class="shopping-panel-head">
            <h2 id="shopping-list-title">Sua lista</h2>
            <span>${data.total} ${data.total === 1 ? "item" : "itens"}</span>
          </div>

          ${data.total ? data.groups.map(renderShoppingAisle).join("") : `
            <div class="shopping-empty">
              <div class="empty-icon">${icon("bag")}</div>
              <h3>Sua lista está vazia.</h3>
              <p>Adicione um item ao lado ou monte seu plano semanal.</p>
            </div>
          `}
        </section>

        <aside class="shopping-aside">
          <section class="add-item-card">
            <h3>Faltou alguma coisa?</h3>
            <p>Adicione itens extras direto à sua lista.</p>
            <form class="add-item-form" id="add-item-form">
              <label class="sr-only" for="new-item">Nome do item</label>
              <input id="new-item" name="item" type="text" maxlength="80" placeholder="Ex.: café, detergente..." required>
              <button type="submit" aria-label="Adicionar item">${icon("plus")}</button>
            </form>
          </section>

          <section class="shop-note">
            ${icon("leaf")}
            <h3>Comprar com plano</h3>
            <p>Uma lista pronta reduz idas ao mercado e evita comprar o que já tem em casa. Revise a despensa antes de sair.</p>
            <a class="text-link" href="#/semana">Revisar plano semanal ${icon("arrow-right")}</a>
          </section>
        </aside>
      </div>
    </div>
  `;
}

function renderShoppingAisle(group) {
  return `
    <section class="shop-aisle">
      <div class="shop-aisle-head">
        ${icon(AISLE_ICONS[group.name] || "bag")}
        <h3>${escapeHTML(group.name)}</h3>
        <span class="shop-aisle-count">${group.items.length}</span>
      </div>
      ${group.items.map(renderShoppingItem).join("")}
    </section>
  `;
}

function renderShoppingItem(item) {
  const checked = state.checkedShopping.includes(item.scopeKey);
  return `
    <label class="shop-item ${checked ? "checked" : ""}">
      <input type="checkbox" data-shop-check="${escapeHTML(item.scopeKey)}" ${checked ? "checked" : ""}>
      <span class="custom-check" aria-hidden="true"></span>
      <span class="shop-name">${escapeHTML(item.name)}</span>
      <span class="shop-qty">${escapeHTML(qtyLabel(item))}</span>
      ${item.kind === "manual" ? `
        <button class="remove-item" type="button" data-remove-custom="${escapeHTML(item.id)}" aria-label="Remover ${escapeHTML(item.name)} da lista">
          ${icon("trash")}
        </button>
      ` : ""}
    </label>
  `;
}

function updateShoppingProgressUI() {
  const inputs = [...document.querySelectorAll("[data-shop-check]")];
  const total = inputs.length;
  const checked = inputs.filter((input) => input.checked).length;
  const percent = total ? Math.round((checked / total) * 100) : 0;
  const count = document.getElementById("shopping-progress-count");
  const bar = document.querySelector("#shopping-progress-bar span");
  const percentEl = document.getElementById("shopping-progress-percent");
  const markAll = document.querySelector("[data-mark-all]");

  const scopeLabel = ui.shoppingScope === "week"
    ? rangeLabel(weekDates(ui.selectedDate)[0], weekDates(ui.selectedDate)[6])
    : capitalize(dateLong(ui.selectedDate));

  if (count) count.textContent = `${checked} de ${total} itens comprados · ${scopeLabel}`;
  if (bar) bar.style.width = `${percent}%`;
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (markAll) {
    const allChecked = total > 0 && checked === total;
    markAll.innerHTML = `${icon(allChecked ? "x" : "check")} ${allChecked ? "Desmarcar" : "Marcar todos"}`;
  }
}

function toggleAllShopping(checked) {
  const inputs = [...document.querySelectorAll("[data-shop-check]")];
  const keys = inputs.map((input) => input.dataset.shopCheck);
  if (checked) {
    state.checkedShopping = [...new Set([...state.checkedShopping, ...keys])];
  } else {
    const remove = new Set(keys);
    state.checkedShopping = state.checkedShopping.filter((key) => !remove.has(key));
  }
  saveState();
  refreshCurrentRoute({ keepScroll: true });
  showToast(checked ? "Todos os itens marcados como comprados." : "Itens desmarcados.", checked ? "check" : "x");
}

function addCustomShoppingItem(name) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return;
  const exists = state.customShopping.some((item) =>
    item.scope === ui.shoppingScope && normalizeText(item.name) === normalizeText(clean)
  );
  if (exists) {
    showToast("Esse item já está na sua lista.", "info");
    return;
  }
  state.customShopping.push({
    id: `custom-${Date.now()}`,
    name: clean,
    scope: ui.shoppingScope,
    createdAt: Date.now()
  });
  saveState();
  refreshCurrentRoute({ keepScroll: true });
  showToast(`“${clean}” adicionado à lista.`, "check");
}

/* =========================================================
   Modais
   ========================================================= */

function openModal(content) {
  if (chatState.open) closeChat({ restoreFocus: false });
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
  document.body.classList.add("modal-open");
  modalRoot.innerHTML = `<div class="modal-backdrop" data-modal-backdrop>${content}</div>`;

  requestAnimationFrame(() => {
    const target = modalRoot.querySelector(".modal");
    if (target) target.focus({ preventScroll: true });
  });
}

function closeModal() {
  if (!modalRoot.innerHTML) return;
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
  document.body.style.paddingRight = "";
  if (lastFocused && document.contains(lastFocused)) {
    lastFocused.focus({ preventScroll: true });
  }
  lastFocused = null;
}

function openRecipe(recipeId, contextMeal = null) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return;

  const selectedMeal = contextMeal && MEALS.some((meal) => meal.id === contextMeal)
    ? contextMeal
    : recipe.meal;
  const fav = isFavorite(recipe.id);

  openModal(`
    <div class="modal recipe-modal" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title" tabindex="-1">
      <button class="modal-close" type="button" data-close-modal aria-label="Fechar receita">${icon("x")}</button>

      <div class="detail-media">
        <img src="${recipe.image}" alt="${escapeHTML(recipe.title)}">
        <div class="detail-media-badges">
          <span class="detail-media-badge">${recipe.category}</span>
          <span class="detail-media-badge">${recipe.time} min · ${recipe.difficulty}</span>
        </div>
      </div>

      <div class="detail-content">
        <div class="detail-kicker">${recipe.category}<span class="sep"></span>${recipe.difficulty}<span class="sep"></span>${recipe.time} min</div>

        <div class="detail-title-row">
          <h2 id="recipe-modal-title">${escapeHTML(recipe.title)}</h2>
          <button class="detail-fav ${fav ? "is-fav" : ""}" type="button" data-fav="${recipe.id}" aria-label="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}" aria-pressed="${fav}">
            ${icon("heart")}
          </button>
        </div>

        <p class="detail-sub">${escapeHTML(recipe.subtitle)}</p>

        <div class="detail-tags">
          ${recipe.tags.map((tag) => `<span class="detail-tag">${escapeHTML(tag)}</span>`).join("")}
        </div>

        <div class="nutrition-grid" aria-label="Informação nutricional por porção">
          <div class="nutrition-cell"><strong>${formatNumber(recipe.kcal)}</strong><span>kcal</span></div>
          <div class="nutrition-cell"><strong>${recipe.protein} g</strong><span>proteína</span></div>
          <div class="nutrition-cell"><strong>${recipe.carbs} g</strong><span>carboidratos</span></div>
          <div class="nutrition-cell"><strong>${recipe.fat} g</strong><span>gorduras</span></div>
        </div>

        <section class="detail-section" aria-labelledby="ingredients-title">
          <div class="detail-section-head">
            <h3 id="ingredients-title">Ingredientes</h3>
            <span>1 porção</span>
          </div>
          <ul class="ingredient-list">
            ${recipe.ingredients.map((ingredient) => `
              <li>
                <span>${escapeHTML(ingredient.name)}</span>
                <span class="ing-qty">${escapeHTML(qtyLabel(ingredient))}</span>
              </li>
            `).join("")}
          </ul>
        </section>

        <section class="detail-section" aria-labelledby="steps-title">
          <div class="detail-section-head">
            <h3 id="steps-title">Modo de preparo</h3>
            <span>${recipe.steps.length} passos</span>
          </div>
          <ol class="steps-list">
            ${recipe.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}
          </ol>
        </section>

        <div class="recipe-tip">
          ${icon("leaf")}
          <p><strong>Toque da nutri</strong>${escapeHTML(recipe.tip)}</p>
        </div>

        <div class="detail-actions">
          <div class="meal-select-wrap">
            <label class="sr-only" for="detail-meal-select">Refeição</label>
            <select class="meal-select" id="detail-meal-select">
              ${MEALS.map((meal) => `<option value="${meal.id}" ${meal.id === selectedMeal ? "selected" : ""}>${meal.name}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn-coral detail-add-btn" type="button" data-add-recipe="${recipe.id}">
            ${icon("plus")} Adicionar ao meu dia
          </button>
        </div>
      </div>
    </div>
  `);
}

function openSwapModal(mealId) {
  const meal = mealById(mealId);
  const currentPlan = planFor(ui.selectedDate);
  const currentRecipeId = currentPlan[meal.id];
  const options = recipeOptions(meal.id);

  openModal(`
    <div class="modal swap-modal" role="dialog" aria-modal="true" aria-labelledby="swap-modal-title" tabindex="-1">
      <button class="modal-close" type="button" data-close-modal aria-label="Fechar opções">${icon("x")}</button>

      <div class="swap-head">
        <div class="eyebrow">Troca sem culpa</div>
        <h2 id="swap-modal-title">O que vai no <em>${meal.name.toLowerCase()}</em>?</h2>
        <p>${escapeHTML(capitalize(dateLong(ui.selectedDate)))} · escolha uma opção e o seu dia se ajusta na hora.</p>
      </div>

      <div class="swap-options">
        ${options.map((recipe) => {
          const current = recipe.id === currentRecipeId;
          return `
            <button class="swap-option ${current ? "is-current" : ""}" type="button" data-pick-recipe="${recipe.id}" data-pick-meal="${meal.id}" aria-label="${escapeHTML(recipe.title)}${current ? ", no seu prato agora" : ""}">
              <img class="swap-thumb" src="${recipe.image}" alt="">
              <span class="swap-copy">
                <span class="swap-title">${escapeHTML(recipe.title)}${current ? '<span class="current-pill">No seu prato</span>' : ""}</span>
                <span class="swap-desc">${escapeHTML(recipe.subtitle)}</span>
                <span class="swap-meta">
                  <span>${formatNumber(recipe.kcal)} kcal</span>
                  <span>${recipe.protein} g proteína</span>
                  <span>${recipe.time} min</span>
                </span>
              </span>
              <span class="swap-radio">${icon("check")}</span>
            </button>
          `;
        }).join("")}
      </div>

      <div class="swap-foot">
        <span>As calorias e os macros do dia se ajustam automaticamente.</span>
        <span>1 porção</span>
      </div>
    </div>
  `);
}

function openProfileModal() {
  const profile = state.profile;
  openModal(`
    <div class="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" tabindex="-1">
      <button class="modal-close" type="button" data-close-modal aria-label="Fechar perfil">${icon("x")}</button>

      <div class="profile-head">
        <div class="profile-avatar-lg">${escapeHTML(initials(profile.name))}</div>
        <div class="eyebrow">Seu perfil</div>
        <h2 id="profile-modal-title">Ajustar meu plano</h2>
        <p>Pequenas mudanças no seu dia a dia também contam. Atualize suas metas quando fizer sentido para você.</p>
      </div>

      <form id="profile-form" class="profile-form">
        <div class="field full">
          <label for="profile-name-field">Nome</label>
          <input id="profile-name-field" name="name" type="text" maxlength="60" minlength="2" value="${escapeHTML(profile.name)}" required>
        </div>

        <div class="field full">
          <label for="profile-goal-field">Objetivo</label>
          <select id="profile-goal-field" name="goalLabel">
            ${GOAL_OPTIONS.map((option) => `<option value="${option}" ${profile.goalLabel === option ? "selected" : ""}>${option}</option>`).join("")}
          </select>
        </div>

        <div class="field">
          <label for="profile-calories-field">Meta calórica diária</label>
          <input id="profile-calories-field" name="calories" type="number" inputmode="numeric" min="1200" max="4000" step="50" value="${profile.calories}" required>
          <span class="field-hint">Entre 1.200 e 4.000 kcal.</span>
        </div>

        <div class="field">
          <label for="profile-water-field">Meta de água</label>
          <input id="profile-water-field" name="waterGoal" type="number" inputmode="numeric" min="4" max="16" step="1" value="${profile.waterGoal}" required>
          <span class="field-hint">Em copos de 250 ml.</span>
        </div>

        <p class="profile-privacy field full">${icon("info")} Os macros são ajustados na mesma proporção da nova meta calórica. Seus dados ficam salvos apenas neste navegador.</p>

        <div class="profile-actions field full">
          <button class="reset-btn" type="button" data-reset-profile>Redefinir dados</button>
          <div class="profile-actions-right">
            <button class="btn btn-soft" type="button" data-close-modal>Cancelar</button>
            <button class="btn btn-dark" type="submit">Salvar alterações</button>
          </div>
        </div>
      </form>
    </div>
  `);
}

function handleProfileSubmit(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const calories = Number(data.get("calories"));
  const waterGoal = Number(data.get("waterGoal"));
  const goalLabel = String(data.get("goalLabel") || state.profile.goalLabel);

  if (name.length < 2) {
    form.querySelector('[name="name"]')?.focus();
    return;
  }
  if (!Number.isFinite(calories) || calories < 1200 || calories > 4000) {
    form.querySelector('[name="calories"]')?.focus();
    return;
  }
  if (!Number.isFinite(waterGoal) || waterGoal < 4 || waterGoal > 16) {
    form.querySelector('[name="waterGoal"]')?.focus();
    return;
  }

  const old = state.profile;
  const ratio = calories / Math.max(1, old.calories);
  state.profile = {
    ...old,
    name,
    firstName: firstNameOf(name),
    goalLabel,
    calories: Math.round(calories),
    protein: Math.max(40, Math.round(old.protein * ratio)),
    carbs: Math.max(50, Math.round(old.carbs * ratio)),
    fat: Math.max(20, Math.round(old.fat * ratio)),
    waterGoal: Math.round(waterGoal)
  };
  saveState();
  closeModal();
  syncChrome();
  refreshCurrentRoute({ keepScroll: true });
  showToast("Seu plano foi atualizado.", "sparkle");
}

function resetAllData() {
  state = freshState(false);
  saveState();
  ui.selectedDate = todayIso();
  ui.filter = "all";
  ui.search = "";
  ui.shoppingScope = "week";
  closeModal();
  history.replaceState(null, "", "#/meu-dia");
  renderRoute({ scrollTop: true });
  showToast("Tudo pronto para começar de novo.", "leaf");
}

/* =========================================================
   Toasts
   ========================================================= */

function showToast(message, iconName = "check") {
  if (!toastRoot) return;
  toastRoot.innerHTML = "";
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `${icon(iconName)}<span>${escapeHTML(message)}</span>`;
  toastRoot.appendChild(toast);

  window.setTimeout(() => {
    if (!toast.isConnected) return;
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 230);
  }, 3400);
}

/* =========================================================
   Nina — chat contextual
   ========================================================= */

function buildChatContext() {
  const iso = ui.selectedDate;
  const entries = planRecipes(iso).map(({ meal, recipe }) => ({
    mealId: meal.id,
    mealName: meal.name,
    mealTime: meal.time,
    recipeId: recipe.id,
    title: recipe.title,
    kcal: recipe.kcal,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    recipeTime: recipe.time,
    ingredients: recipe.ingredients,
    tags: recipe.tags,
    recipe
  }));
  const totals = nutritionForPlan(iso);
  const profile = state.profile;
  const days = weekDates(iso);
  const weekNutrition = days.map((day) => nutritionForPlan(day));
  const weekAverage = Math.round(weekNutrition.reduce((sum, day) => sum + day.kcal, 0) / days.length);
  const weekUnique = new Set(days.flatMap((day) => planRecipes(day).map((entry) => entry.recipe.id))).size;
  const shopping = getShoppingData("week");
  const dayShopping = getShoppingData("day");
  const checkedSet = new Set(state.checkedShopping);
  const pendingFrom = (data) => data.groups
    .flatMap((group) => group.items)
    .filter((item) => !checkedSet.has(item.scopeKey))
    .map((item) => ({ name: item.name, qty: qtyLabel(item), aisle: item.aisle }));
  const pendingItems = pendingFrom(shopping);
  const dayPendingItems = pendingFrom(dayShopping);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const entriesWithMinutes = entries
    .map((entry) => {
      const [hour, minute] = entry.mealTime.split(":").map(Number);
      return { ...entry, minutes: hour * 60 + minute };
    })
    .sort((a, b) => a.minutes - b.minutes);
  const nextMealEntry = isToday(iso)
    ? (entriesWithMinutes.find((entry) => entry.minutes >= nowMinutes) || entriesWithMinutes[0] || null)
    : (entriesWithMinutes[0] || null);
  const weekPlan = days.map((day) => ({
    date: day,
    dateLabel: capitalize(dateLong(day)),
    weekday: weekdayLong(day),
    isToday: isToday(day),
    totals: nutritionForPlan(day),
    entries: planRecipes(day).map(({ meal, recipe }) => ({
      mealId: meal.id,
      mealName: meal.name,
      mealTime: meal.time,
      recipeId: recipe.id,
      title: recipe.title,
      kcal: recipe.kcal,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat
    }))
  }));

  return {
    name: firstNameOf(profile.name),
    weekday: weekdayLong(iso),
    shortDate: dateShort(iso),
    dateLabel: capitalize(dateLong(iso)),
    selectedDate: iso,
    isToday: isToday(iso),
    route: ui.route,
    currentTime: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    profile: { ...profile },
    entries,
    nextMeal: nextMealEntry ? {
      mealId: nextMealEntry.mealId,
      mealName: nextMealEntry.mealName,
      mealTime: nextMealEntry.mealTime,
      recipeId: nextMealEntry.recipeId,
      title: nextMealEntry.title,
      forSelectedDate: isToday(iso)
    } : null,
    totals,
    remaining: Math.round(profile.calories - totals.kcal),
    pct: Math.round((totals.kcal / profile.calories) * 100),
    doneCount: MEALS.filter((meal) => Boolean(state.done[iso] && state.done[iso][meal.id])).length,
    water: {
      current: Number(state.water[iso] || 0),
      goal: profile.waterGoal
    },
    shopping: {
      total: shopping.total,
      checked: shopping.checked,
      pending: shopping.total - shopping.checked,
      preview: pendingItems.slice(0, 3),
      pendingItems,
      day: {
        total: dayShopping.total,
        checked: dayShopping.checked,
        pending: dayShopping.total - dayShopping.checked,
        pendingItems: dayPendingItems
      }
    },
    week: {
      average: weekAverage,
      averagePct: Math.round((weekAverage / profile.calories) * 100),
      uniqueRecipes: weekUnique
    },
    weekRange: rangeLabel(days[0], days[6]),
    weekPlan,
    favorites: state.favorites.map((id) => getRecipe(id)?.title).filter(Boolean),
    favoritesCount: state.favorites.length
  };
}

function buildDeepSeekContext() {
  const context = buildChatContext();
  return {
    app: {
      name: "Prato Amarrado",
      assistant: "Nina",
      selectedDate: context.selectedDate,
      weekday: context.weekday,
      isToday: context.isToday,
      currentTime: context.currentTime,
      currentRoute: context.route,
      sections: {
        "meu-dia": "Plano do dia selecionado, calorias, macros, refeições, hidratação e registro de refeições.",
        "receitas": "Biblioteca com busca, filtros por refeição e favoritos. Cada receita tem ficha com ingredientes, preparo, nutrição e dica.",
        "semana": "Plano dos sete dias, médias da semana e geração de variação do cardápio.",
        "compras": "Lista de compras gerada do plano, com visão da semana ou do dia, itens marcados e itens extras.",
        "perfil": "Ajuste de nome, objetivo, meta calórica e meta de água."
      }
    },
    user: {
      name: context.name,
      goal: context.profile.goalLabel,
      targets: {
        calories: context.profile.calories,
        protein: context.profile.protein,
        carbs: context.profile.carbs,
        fat: context.profile.fat,
        waterGlasses: context.profile.waterGoal
      }
    },
    currentPlan: context.entries.map((entry) => ({
      mealId: entry.mealId,
      mealName: entry.mealName,
      mealTime: entry.mealTime,
      recipeId: entry.recipeId,
      title: entry.title,
      kcal: entry.kcal,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      recipeTime: entry.recipeTime,
      ingredients: entry.ingredients.map((ingredient) => `${ingredient.name} — ${qtyLabel(ingredient)}`),
      tags: entry.tags
    })),
    nextMeal: context.nextMeal,
    totals: context.totals,
    remaining: context.remaining,
    pct: context.pct,
    doneCount: context.doneCount,
    water: context.water,
    shopping: {
      total: context.shopping.total,
      checked: context.shopping.checked,
      pending: context.shopping.pending,
      pendingItems: context.shopping.pendingItems,
      day: context.shopping.day
    },
    week: context.week,
    weekRange: context.weekRange,
    weekPlan: context.weekPlan,
    favorites: context.favorites,
    favoritesCount: context.favoritesCount,
    meals: MEALS.map((meal) => ({
      id: meal.id,
      name: meal.name,
      time: meal.time,
      options: RECIPES.filter((recipe) => recipe.meal === meal.id).map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        subtitle: recipe.subtitle,
        kcal: recipe.kcal,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        time: recipe.time,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
        ingredients: recipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          qty: ingredient.qty,
          unit: ingredient.unit
        })),
        steps: recipe.steps,
        tip: recipe.tip
      }))
    }))
  };
}

function buildDeepSeekPhotoContext() {
  const context = buildChatContext();
  return {
    app: {
      name: "Prato Amarrado",
      assistant: "Nina",
      selectedDate: context.selectedDate,
      weekday: context.weekday,
      isToday: context.isToday,
      currentTime: context.currentTime
    },
    user: {
      name: context.name,
      goal: context.profile.goalLabel,
      targets: {
        calories: context.profile.calories,
        protein: context.profile.protein,
        carbs: context.profile.carbs,
        fat: context.profile.fat,
        waterGlasses: context.profile.waterGoal
      }
    },
    currentPlan: context.entries.map((entry) => ({
      mealId: entry.mealId,
      mealName: entry.mealName,
      mealTime: entry.mealTime,
      recipeId: entry.recipeId,
      title: entry.title,
      kcal: entry.kcal,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat
    })),
    nextMeal: context.nextMeal,
    totals: context.totals,
    remaining: context.remaining,
    pct: context.pct,
    water: context.water
  };
}

function setChatBackendStatus(status, { model = null, title = "" } = {}) {
  chatBackend.status = status;
  if (model) chatBackend.model = model;

  const badge = document.getElementById("chat-status-badge");
  const label = document.getElementById("chat-mode-label");
  const disclaimer = document.getElementById("chat-disclaimer");

  if (badge) {
    badge.classList.toggle("is-api", status === "api");
    badge.classList.toggle("is-local", status === "local");
    const defaultTitle = status === "api"
      ? "Respostas geradas pela API do DeepSeek"
      : status === "local"
        ? "Modo local. Defina DEEPSEEK_API_KEY no servidor para ativar a DeepSeek."
        : "Verificando conexão com a API";
    badge.title = title || defaultTitle;
  }

  if (label) {
    label.textContent = status === "api" ? "DeepSeek" : status === "local" ? "modo local" : "conectando";
  }

  if (disclaimer) {
    disclaimer.textContent = status === "api"
      ? "IA via DeepSeek. Contexto do plano e fotos anexadas são enviados para gerar a resposta. Orientações do app, não substituem acompanhamento profissional."
      : "Orientações do app. Não substituem acompanhamento profissional.";
  }

  const connectionNote = document.getElementById("chat-connection-note");
  if (connectionNote) {
    if (status === "local") {
      connectionNote.hidden = false;
      if (window.location.protocol === "file:") {
        connectionNote.innerHTML = "<strong>Modo local.</strong> Para conversar sobre nutrição, dietética e gastronomia, abra o app pelo servidor local: <a href=\"http://127.0.0.1:4173\" target=\"_blank\" rel=\"noreferrer\">http://127.0.0.1:4173</a>.";
      } else {
        connectionNote.innerHTML = "<strong>Modo local.</strong> A IA completa não está configurada neste servidor. Preencha <code>DEEPSEEK_API_KEY</code> no <code>.env</code> e reinicie.";
      }
    } else {
      connectionNote.hidden = true;
      connectionNote.innerHTML = "";
    }
  }
}

function detectChatBackend(force = false) {
  if (force) chatBackendPromise = null;
  if (chatBackendPromise) return chatBackendPromise;

  setChatBackendStatus("checking");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);

  chatBackendPromise = fetch(`${CHAT_API_BASE}/api/health`, {
    method: "GET",
    cache: "no-store",
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Health check failed");
      return response.json();
    })
    .then((data) => {
      chatBackend.configured = Boolean(data && data.configured);
      chatBackend.available = chatBackend.configured;
      chatBackend.model = data && data.model ? data.model : null;
      setChatBackendStatus(chatBackend.configured ? "api" : "local");
      return chatBackend;
    })
    .catch(() => {
      chatBackend.configured = false;
      chatBackend.available = false;
      setChatBackendStatus("local");
      return chatBackend;
    })
    .finally(() => {
      window.clearTimeout(timeout);
    });

  return chatBackendPromise;
}

async function ensureChatBackend() {
  if (chatBackend.status === "unknown") await detectChatBackend();
  return chatBackend;
}

function mapApiActions(rawActions) {
  if (!Array.isArray(rawActions)) return [];
  const actions = [];
  const seen = new Set();

  rawActions.slice(0, 2).forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    let mapped = null;

    if (raw.type === "navigate" && CHAT_ROUTE_META[raw.route]) {
      mapped = {
        action: "navigate",
        route: raw.route,
        label: CHAT_ROUTE_META[raw.route].label,
        icon: CHAT_ROUTE_META[raw.route].icon
      };
    } else if (raw.type === "swap") {
      const meal = MEALS.find((item) => item.id === raw.meal);
      if (meal) {
        mapped = {
          action: "swap",
          meal: meal.id,
          label: `Trocar ${meal.name.toLowerCase()}`,
          icon: "swap"
        };
      }
    } else if (raw.type === "recipe") {
      const recipe = getRecipe(raw.recipeId);
      if (recipe) {
        mapped = {
          action: "recipe",
          recipeId: recipe.id,
          label: `Ver ${chatShortLabel(recipe.title)}`,
          icon: "arrow-up-right"
        };
      }
    } else if (raw.type === "set_recipe") {
      const meal = MEALS.find((item) => item.id === raw.meal);
      const recipe = getRecipe(raw.recipeId);
      if (meal && recipe) {
        mapped = {
          action: "set-recipe",
          meal: meal.id,
          recipeId: recipe.id,
          label: `Usar ${chatShortLabel(recipe.title, 24)}`,
          icon: "plus"
        };
      }
    } else if (raw.type === "water") {
      mapped = { action: "water", label: "Registrar 1 copo", icon: "plus" };
    } else if (raw.type === "profile") {
      mapped = { action: "profile", label: "Ajustar metas", icon: "sliders" };
    }

    if (mapped) {
      const key = `${mapped.action}:${mapped.route || mapped.meal || ""}:${mapped.recipeId || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        actions.push(mapped);
      }
    }
  });

  return actions;
}

function chatShortLabel(text, max = 26) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function localChatReply(text) {
  try {
    if (!window.PratoChat) throw new Error("Local chatbot unavailable");
    return window.PratoChat.reply(text, buildChatContext(), chatState.session);
  } catch (_) {
    return {
      text: "Tive um problema para pensar nisso agora. Pode tentar de novo? Se preferir, abra o seu dia ou a biblioteca de receitas.",
      actions: [
        { action: "navigate", route: "meu-dia", label: "Abrir meu dia", icon: "home" },
        { action: "navigate", route: "receitas", label: "Ver receitas", icon: "book" }
      ],
      quickReplies: ["O que tem hoje?", "Como funciona o app?"],
      session: chatState.session,
      topic: "fallback"
    };
  }
}

async function requestDeepSeekReply() {
  const controller = new AbortController();
  chatState.apiAbort = controller;
  const timeout = window.setTimeout(() => controller.abort(), 32000);
  const history = chatState.messages
    .filter((message) => (message.role === "user" || message.role === "bot") && !message.apiError && !message.failed && !message.image)
    .slice(-12)
    .map((message) => ({
      role: message.role === "bot" ? "assistant" : "user",
      content: message.text
    }));

  try {
    const response = await fetch(`${CHAT_API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        messages: history,
        context: buildDeepSeekContext()
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) { /* resposta inválida abaixo */ }

    if (!response.ok) {
      const error = new Error(
        data && data.error && data.error.message
          ? data.error.message
          : `A API respondeu com status ${response.status}.`
      );
      error.status = response.status;
      error.code = data && data.error ? data.error.code : "api_error";
      throw error;
    }

    if (!data || !String(data.message || "").trim()) {
      const emptyError = new Error("A API retornou uma resposta vazia.");
      emptyError.code = "empty_response";
      throw emptyError;
    }

    return {
      text: String(data.message).trim(),
      actions: mapApiActions(data.actions),
      quickReplies: Array.isArray(data.quickReplies)
        ? data.quickReplies.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
        : [],
      model: data.model || chatBackend.model || "deepseek-flash",
      source: "deepseek"
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("A DeepSeek demorou demais para responder.");
      timeoutError.code = "deepseek_timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    if (chatState.apiAbort === controller) chatState.apiAbort = null;
  }
}

async function requestFoodPhotoAnalysis(question, imageDataUrl) {
  const controller = new AbortController();
  chatState.apiAbort = controller;
  const timeout = window.setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${CHAT_API_BASE}/api/food-photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        image: imageDataUrl,
        question,
        context: buildDeepSeekPhotoContext()
      })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_) { /* resposta inválida abaixo */ }

    if (!response.ok) {
      const error = new Error(
        data && data.error && data.error.message
          ? data.error.message
          : `A análise respondeu com status ${response.status}.`
      );
      error.status = response.status;
      error.code = data && data.error ? data.error.code : "photo_error";
      throw error;
    }

    if (!data || !String(data.message || "").trim()) {
      const emptyError = new Error("A análise da foto retornou uma resposta vazia.");
      emptyError.code = "empty_response";
      throw emptyError;
    }

    const foods = Array.isArray(data.foods) ? data.foods : [];
    const totals = data.totals && typeof data.totals === "object"
      ? data.totals
      : foods.reduce((sum, food) => ({
        kcal: sum.kcal + Number(food.kcal || 0),
        protein: sum.protein + Number(food.protein || 0),
        carbs: sum.carbs + Number(food.carbs || 0),
        fat: sum.fat + Number(food.fat || 0)
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      text: String(data.message).trim(),
      actions: mapApiActions(data.actions),
      quickReplies: Array.isArray(data.quickReplies)
        ? data.quickReplies.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
        : [],
      analysis: {
        foods,
        totals,
        confidence: data.confidence || "baixa",
        notes: data.notes || "Estimativa visual: porções e preparo podem mudar os valores."
      },
      model: data.model || chatBackend.model || "deepseek-flash",
      source: "deepseek"
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("A análise da foto demorou demais para responder.");
      timeoutError.code = "deepseek_timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    if (chatState.apiAbort === controller) chatState.apiAbort = null;
  }
}

function notifyDeepSeekFailure(isFatal = false) {
  if (chatBackend.fallbackNotified && !isFatal) return;
  chatBackend.fallbackNotified = true;
  showToast(
    isFatal
      ? "A DeepSeek não aceitou a configuração atual. A Nina seguiu no modo local."
      : "A DeepSeek não respondeu agora. Tente novamente em instantes.",
    "info"
  );
}

function apiFailureReply(question) {
  return {
    text: "Não consegui falar com a DeepSeek agora. Para não te passar uma informação errada, preferi não improvisar uma resposta.\nTente novamente em alguns instantes.",
    actions: [
      { action: "retry", question, label: "Tentar novamente", icon: "refresh" },
      { action: "navigate", route: "meu-dia", label: "Abrir meu dia", icon: "home" }
    ],
    quickReplies: [],
    topic: "api-failure",
    apiError: true
  };
}

function registerChatApiFailure(error) {
  const fatalCodes = new Set(["deepseek_auth", "deepseek_payment", "missing_api_key"]);
  const fatal = fatalCodes.has(error && error.code);

  if (fatal) {
    chatBackend.available = false;
    setChatBackendStatus("local", {
      title: "Modo local. A chave ou o saldo da DeepSeek precisa ser verificado no servidor."
    });
  } else {
    setChatBackendStatus("api", {
      title: "A DeepSeek está instável; a próxima mensagem tentará a API novamente."
    });
  }

  notifyDeepSeekFailure(fatal);
  return fatal;
}

function photoUnavailableReply() {
  return {
    text: "A análise por foto precisa da API do DeepSeek configurada no servidor. Enquanto isso, você pode abrir suas receitas ou me contar o que está no prato.",
    actions: [
      { action: "navigate", route: "receitas", label: "Abrir receitas", icon: "book" },
      { action: "navigate", route: "meu-dia", label: "Ver meu dia", icon: "home" }
    ],
    quickReplies: [],
    topic: "photo-unavailable",
    apiError: true
  };
}

function photoFailureReply() {
  return {
    text: "Não consegui analisar a foto agora. Para não inventar o que está no prato, preferi não dar uma estimativa.\nTente anexar a foto novamente em alguns instantes.",
    actions: [
      { action: "navigate", route: "meu-dia", label: "Abrir meu dia", icon: "home" },
      { action: "navigate", route: "receitas", label: "Explorar receitas", icon: "book" }
    ],
    quickReplies: [],
    topic: "photo-failure",
    apiError: true
  };
}

function initializeChatConversation() {
  if (!window.PratoChat) {
    chatState.messages = [{
      role: "bot",
      text: "Oi! Estou aqui para te ajudar a navegar pelo Prato Amarrado. O que você quer fazer?",
      actions: [
        { action: "navigate", route: "meu-dia", label: "Abrir meu dia", icon: "home" },
        { action: "navigate", route: "receitas", label: "Ver receitas", icon: "book" }
      ]
    }];
    chatState.quickReplies = ["O que tem no almoço?", "Quantas calorias faltam?"];
    chatState.initialized = true;
    return;
  }

  const reply = window.PratoChat.welcome(buildChatContext());
  chatState.messages = [{
    role: "bot",
    text: reply.text,
    actions: Array.isArray(reply.actions) ? reply.actions : []
  }];
  chatState.quickReplies = Array.isArray(reply.quickReplies) ? reply.quickReplies : [];
  chatState.session = reply.session && typeof reply.session === "object" ? reply.session : {};
  chatState.topic = reply.topic || "welcome";
  chatState.initialized = true;
}

function openChat() {
  if (chatState.open) {
    if (window.matchMedia("(min-width: 900px)").matches) chatInput.focus({ preventScroll: true });
    return;
  }

  if (chatBackend.status === "unknown") detectChatBackend();

  const firstOpen = !chatState.initialized;
  if (firstOpen) {
    initializeChatConversation();
    if (chatFabBadge) chatFabBadge.hidden = true;
  }

  chatState.open = true;
  chatPanel.hidden = false;
  chatFab.hidden = true;
  chatFab.setAttribute("aria-expanded", "true");
  document.body.classList.add("chat-open");
  updateChatContext();
  updateChatPlaceholder();
  renderChatMessages();
  renderChatQuickReplies();
  if (firstOpen) scrollChatToTop();

  if (window.matchMedia("(min-width: 900px)").matches) {
    window.setTimeout(() => chatInput.focus({ preventScroll: true }), 90);
  }
}

function closeChat({ restoreFocus = true } = {}) {
  if (!chatState.open) return;
  stopVoiceRecognition({ abort: true });
  chatState.open = false;
  chatPanel.hidden = true;
  chatFab.hidden = false;
  chatFab.setAttribute("aria-expanded", "false");
  document.body.classList.remove("chat-open");
  chatInput.blur();
  if (restoreFocus) {
    window.requestAnimationFrame(() => chatFab.focus({ preventScroll: true }));
  }
}

function resetChatConversation() {
  chatState.requestSeq += 1;
  if (chatState.apiAbort) {
    chatState.apiAbort.abort();
    chatState.apiAbort = null;
  }
  stopVoiceRecognition({ abort: true });
  clearChatPhoto();
  chatState.typing = false;
  chatSend.disabled = false;
  chatInput.value = "";
  chatState.messages = [];
  chatState.quickReplies = [];
  chatState.session = {};
  chatState.topic = null;
  initializeChatConversation();
  renderChatMessages();
  renderChatQuickReplies();
  scrollChatToTop();
  updateChatContext();
  if (window.matchMedia("(min-width: 900px)").matches) {
    window.setTimeout(() => chatInput.focus({ preventScroll: true }), 60);
  }
}

function renderChatMessages() {
  if (!chatMessages) return;

  const messages = chatState.messages.map((message, messageIndex) => {
    const actions = Array.isArray(message.actions) ? message.actions : [];
    const actionsHTML = actions.length ? `
      <div class="chat-actions">
        ${actions.map((action, actionIndex) => `
          <button class="chat-action" type="button" data-chat-message-index="${messageIndex}" data-chat-action-index="${actionIndex}">
            ${icon(action.icon || "arrow-right")}
            <span>${escapeHTML(action.label)}</span>
          </button>
        `).join("")}
      </div>
    ` : "";

    const photoHTML = message.image && String(message.image).startsWith("data:image/")
      ? `<div class="chat-photo-message"><img src="${escapeHTML(message.image)}" alt="Foto enviada para análise"></div>`
      : "";
    const analysisHTML = message.analysis ? renderChatAnalysis(message.analysis) : "";

    return `
      <div class="chat-msg ${message.role}">
        <div class="chat-stack">
          ${photoHTML}
          <div class="chat-bubble">${escapeHTML(message.text)}</div>
          ${analysisHTML}
          ${actionsHTML}
        </div>
      </div>
    `;
  }).join("");

  const typingHTML = chatState.typing ? `
    <div class="chat-msg bot" aria-label="Nina está digitando">
      <div class="chat-typing" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>
  ` : "";

  chatMessages.innerHTML = messages + typingHTML;
  scrollChatToBottom();
}

function renderChatAnalysis(analysis) {
  if (!analysis || !Array.isArray(analysis.foods) || !analysis.foods.length) return "";
  const confidenceLabels = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" };
  const confidence = ["alta", "media", "baixa"].includes(analysis.confidence) ? analysis.confidence : "baixa";
  const foods = analysis.foods.map((food) => `
    <li class="analysis-food">
      <span>
        <span class="analysis-food-name">${escapeHTML(food.name)}</span>
        <span class="analysis-food-portion">${escapeHTML(food.portion || "porção estimada")}</span>
      </span>
      <span class="analysis-food-kcal">${formatNumber(food.kcal || 0)} kcal</span>
    </li>
  `).join("");
  const totals = analysis.totals || { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  return `
    <section class="chat-analysis" aria-label="Estimativa nutricional da foto">
      <div class="chat-analysis-head">
        <span>Leitura da foto</span>
        <span class="analysis-confidence ${confidence}">${confidenceLabels[confidence]}</span>
      </div>
      <ul class="analysis-foods">${foods}</ul>
      <div class="analysis-totals">
        <div class="analysis-total"><strong>${formatNumber(totals.kcal)}</strong><span>kcal</span></div>
        <div class="analysis-total"><strong>${formatNumber(totals.protein)} g</strong><span>proteína</span></div>
        <div class="analysis-total"><strong>${formatNumber(totals.carbs)} g</strong><span>carboidratos</span></div>
        <div class="analysis-total"><strong>${formatNumber(totals.fat)} g</strong><span>gorduras</span></div>
      </div>
      <p class="analysis-note">${escapeHTML(analysis.notes || "Estimativa visual: porções e preparo podem mudar os valores.")}</p>
    </section>
  `;
}

function updateChatPlaceholder() {
  if (!chatInput) return;
  if (chatState.voiceListening) {
    chatInput.placeholder = "Ouvindo... fale agora";
  } else if (chatState.pendingPhoto) {
    chatInput.placeholder = "Pergunte sobre a foto ou envie para analisar...";
  } else {
    chatInput.placeholder = "Pergunte sobre seu dia...";
  }
}

function clearChatPhoto() {
  chatState.pendingPhoto = null;
  if (chatAttachmentPreview) chatAttachmentPreview.removeAttribute("src");
  if (chatAttachment) chatAttachment.hidden = true;
  updateChatPlaceholder();
}

function setChatPhoto(dataUrl, name = "foto.jpg") {
  chatState.pendingPhoto = { dataUrl, name };
  if (chatAttachmentPreview) {
    chatAttachmentPreview.src = dataUrl;
    chatAttachmentPreview.alt = `Prévia da foto ${name}`;
  }
  if (chatAttachment) chatAttachment.hidden = false;
  updateChatPlaceholder();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a foto."));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível abrir esta imagem."));
    image.src = dataUrl;
  });
}

async function prepareChatPhoto(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("A foto deve ter no máximo 12 MB.");
  }

  const original = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(original);
  const maxSide = 1100;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

  if (dataUrl.length > 3_500_000) {
    throw new Error("A foto ficou grande demais. Tente outra imagem.");
  }

  return { dataUrl, name: file.name || "foto.jpg" };
}

async function handleChatPhotoFile(file) {
  if (!file || chatState.photoProcessing) return;
  chatState.photoProcessing = true;
  if (chatPhoto) chatPhoto.disabled = true;
  try {
    const photo = await prepareChatPhoto(file);
    setChatPhoto(photo.dataUrl, photo.name);
    showToast("Foto pronta para análise.", "camera");
  } catch (error) {
    showToast(error.message || "Não foi possível anexar a foto.", "info");
  } finally {
    chatState.photoProcessing = false;
    if (chatPhoto) chatPhoto.disabled = false;
  }
}

function setVoiceListening(listening) {
  chatState.voiceListening = listening;
  if (chatMic) {
    chatMic.classList.toggle("is-listening", listening);
    chatMic.setAttribute("aria-pressed", String(listening));
  }
  if (chatMicLabel) {
    chatMicLabel.textContent = listening ? "Ouvindo..." : "Ditar";
  }
  updateChatPlaceholder();
}

function stopVoiceRecognition({ abort = false } = {}) {
  const recognition = chatState.recognition;
  if (!recognition) return;
  try {
    if (abort) recognition.abort();
    else if (chatState.voiceListening) recognition.stop();
  } catch (_) { /* o reconhecimento pode já ter encerrado */ }
  setVoiceListening(false);
}

function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (chatMic) {
      chatMic.disabled = true;
      chatMic.title = "O ditado por voz não é suportado neste navegador. Tente Chrome ou Edge.";
      chatMic.setAttribute("aria-label", "Ditado por voz indisponível neste navegador");
    }
    if (chatMicLabel) chatMicLabel.textContent = "Sem voz";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  chatState.recognition = recognition;

  chatMic.addEventListener("click", () => {
    if (chatState.voiceListening) {
      stopVoiceRecognition();
      return;
    }
    if (chatState.typing) return;
    chatState.voiceBase = chatInput.value.trim();
    try {
      recognition.start();
      setVoiceListening(true);
    } catch (_) {
      setVoiceListening(false);
      showToast("Não foi possível iniciar o microfone. Tente novamente.", "info");
    }
  });

  recognition.onstart = () => setVoiceListening(true);

  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = 0; index < event.results.length; index++) {
      transcript += event.results[index][0].transcript;
    }
    const finalText = transcript.trim();
    if (!finalText) return;
    chatInput.value = [chatState.voiceBase, finalText].filter(Boolean).join(" ");
    chatSend.disabled = false;
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted") return;
    const messages = {
      "not-allowed": "Permita o acesso ao microfone para usar o ditado.",
      "service-not-allowed": "O serviço de voz do navegador não está disponível.",
      "audio-capture": "Nenhum microfone foi encontrado.",
      "no-speech": "Não ouvi nada. Tente falar novamente.",
      network: "O reconhecimento de voz precisa de conexão com a internet."
    };
    showToast(messages[event.error] || "Não foi possível ouvir. Tente novamente.", "info");
    setVoiceListening(false);
  };

  recognition.onend = () => setVoiceListening(false);
}

function setupChatComposerTools() {
  if (chatPhoto && chatPhotoInput) {
    chatPhoto.addEventListener("click", () => chatPhotoInput.click());
    chatPhotoInput.addEventListener("change", () => {
      const file = chatPhotoInput.files && chatPhotoInput.files[0];
      if (file) handleChatPhotoFile(file);
      chatPhotoInput.value = "";
    });
  }

  const removePhoto = chatAttachment && chatAttachment.querySelector("[data-chat-photo-remove]");
  if (removePhoto) {
    removePhoto.addEventListener("click", () => clearChatPhoto());
  }

  setupVoiceRecognition();
  updateChatPlaceholder();
}

function renderChatQuickReplies() {
  if (!chatQuick) return;
  chatQuick.innerHTML = chatState.quickReplies.map((reply, index) => `
    <button class="chat-suggestion" type="button" data-chat-quick="${index}">
      ${escapeHTML(reply)}
    </button>
  `).join("");
}

function updateChatContext() {
  if (!chatContext) return;
  const ctx = buildChatContext();
  const dateLabel = ctx.isToday ? `Hoje · ${ctx.shortDate}` : `${capitalize(ctx.weekday)} · ${ctx.shortDate}`;
  chatContext.innerHTML = `
    <span>${escapeHTML(dateLabel)}</span>
    <span class="chat-context-right"><strong>${formatNumber(ctx.totals.kcal)}</strong> / ${formatNumber(ctx.profile.calories)} kcal</span>
  `;
}

function scrollChatToBottom() {
  window.requestAnimationFrame(() => {
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function scrollChatToTop() {
  window.requestAnimationFrame(() => {
    if (chatMessages) chatMessages.scrollTop = 0;
  });
}

function appendChatBotMessage(text, actions = [], quickReplies = []) {
  chatState.messages.push({ role: "bot", text, actions });
  chatState.quickReplies = Array.isArray(quickReplies) ? quickReplies : [];
  renderChatMessages();
  renderChatQuickReplies();
  updateChatContext();
}

async function sendChatMessage(rawValue) {
  if (chatState.typing || chatState.photoProcessing) return;

  const photo = chatState.pendingPhoto;
  const typedText = String(rawValue ?? chatInput.value ?? "").trim();
  const text = typedText || (photo ? "Analise esta foto e estime calorias e macronutrientes." : "");
  if (!text) return;

  if (chatState.voiceListening) stopVoiceRecognition({ abort: true });

  const userMessage = { role: "user", text, image: photo ? photo.dataUrl : null };
  chatState.messages.push(userMessage);
  chatState.quickReplies = [];
  chatState.typing = true;
  chatInput.value = "";
  chatSend.disabled = true;
  if (photo) clearChatPhoto();
  renderChatMessages();
  renderChatQuickReplies();

  const requestId = ++chatState.requestSeq;
  const startedAt = Date.now();
  const backend = await ensureChatBackend();
  if (requestId !== chatState.requestSeq) return;

  let reply = null;

  if (photo) {
    if (!backend.configured || !backend.available) {
      reply = photoUnavailableReply();
    } else {
      try {
        const apiReply = await requestFoodPhotoAnalysis(text, photo.dataUrl);
        if (requestId !== chatState.requestSeq) return;
        chatBackend.available = true;
        setChatBackendStatus("api", { model: apiReply.model });
        reply = {
          text: apiReply.text,
          actions: apiReply.actions,
          quickReplies: apiReply.quickReplies,
          analysis: apiReply.analysis,
          source: "deepseek"
        };
      } catch (error) {
        if (requestId !== chatState.requestSeq) return;
        userMessage.failed = true;
        registerChatApiFailure(error);
        reply = photoFailureReply();
      }
    }
  } else {
    const localReply = localChatReply(text);
    reply = {
      text: String(localReply.text || ""),
      actions: Array.isArray(localReply.actions) ? localReply.actions : [],
      quickReplies: Array.isArray(localReply.quickReplies) ? localReply.quickReplies : [],
      session: localReply.session,
      topic: localReply.topic,
      source: "local"
    };

    if (backend.configured && backend.available) {
      try {
        const apiReply = await requestDeepSeekReply();
        if (requestId !== chatState.requestSeq) return;
        chatBackend.available = true;
        setChatBackendStatus("api", { model: apiReply.model });
        reply = {
          text: apiReply.text,
          actions: apiReply.actions,
          quickReplies: apiReply.quickReplies,
          session: localReply.session,
          topic: localReply.topic || "deepseek",
          source: "deepseek"
        };
      } catch (error) {
        if (requestId !== chatState.requestSeq) return;
        userMessage.failed = true;
        registerChatApiFailure(error);
        reply = apiFailureReply(text);
      }
    }
  }

  if (!reply) reply = localChatReply(text);
  if (requestId !== chatState.requestSeq) return;

  const elapsed = Date.now() - startedAt;
  if (elapsed < 420) {
    await new Promise((resolve) => window.setTimeout(resolve, 420 - elapsed));
  }
  if (requestId !== chatState.requestSeq) return;

  chatState.messages.push({
    role: "bot",
    text: String(reply.text || "").trim() || "Não consegui formular uma resposta agora. Pode tentar de novo?",
    actions: Array.isArray(reply.actions) ? reply.actions : [],
    analysis: reply.analysis || null,
    apiError: Boolean(reply.apiError)
  });
  chatState.quickReplies = Array.isArray(reply.quickReplies) ? reply.quickReplies : [];
  if (reply.session && typeof reply.session === "object") chatState.session = reply.session;
  if (reply.topic) chatState.topic = reply.topic;
  chatState.typing = false;
  chatSend.disabled = false;
  renderChatMessages();
  renderChatQuickReplies();
  updateChatContext();
}

function navigateFromChat(route, { filter = null, scope = null } = {}) {
  if (filter) {
    ui.filter = filter;
    ui.search = "";
  }
  if (scope) ui.shoppingScope = scope;
  closeChat({ restoreFocus: false });

  if (getRoute() === route) {
    renderRoute({ scrollTop: true });
  } else {
    window.location.hash = `#/${route}`;
  }
}

function searchFromChat(query) {
  ui.search = query || "";
  ui.filter = "all";
  closeChat({ restoreFocus: false });

  if (getRoute() === "receitas") {
    renderRoute({ scrollTop: true });
  } else {
    window.location.hash = "#/receitas";
  }

  window.setTimeout(() => {
    const input = document.getElementById("recipe-search");
    input?.focus({ preventScroll: true });
  }, 140);
}

function handleChatWater() {
  const goal = state.profile.waterGoal;
  const before = Number(state.water[ui.selectedDate] || 0);

  if (before >= goal) {
    appendChatBotMessage(
      `Sua meta de água já está completa: ${before} de ${goal} copos. Que tal manter o ritmo até o fim do dia?`,
      [{ action: "navigate", route: "meu-dia", label: "Ver meu dia", icon: "home" }],
      ["O que tem no jantar?", "Quantas calorias faltam?", "Ver meu dia"]
    );
    return;
  }

  setWater(before + 1);
  const after = Number(state.water[ui.selectedDate] || 0);
  const remaining = Math.max(0, goal - after);
  appendChatBotMessage(
    remaining
      ? `Copo registrado! Agora são ${after} de ${goal} copos — faltam ${remaining} (${(remaining * 250).toLocaleString("pt-BR")} ml).`
      : `Meta de água concluída: ${after} de ${goal} copos. Muito bem!`,
    [
      ...(remaining ? [{ action: "water", label: "Registrar mais um", icon: "plus" }] : []),
      { action: "navigate", route: "meu-dia", label: "Ver meu dia", icon: "home" }
    ],
    ["O que tem no almoço?", "Quantas calorias faltam?", "Como está minha semana?"]
  );
}

function handleChatSetRecipe(mealId, recipeId) {
  const recipe = getRecipe(recipeId);
  const meal = mealById(mealId);
  if (!recipe || !setRecipeForMeal(ui.selectedDate, meal.id, recipeId)) return;

  syncChrome();
  refreshCurrentRoute({ keepScroll: true });
  updateChatContext();

  const totals = nutritionForPlan(ui.selectedDate);
  const remaining = Math.round(state.profile.calories - totals.kcal);
  const balance = remaining >= 0
    ? `${remaining} kcal de margem em relação à meta.`
    : `${Math.abs(remaining)} kcal acima da meta — dá para ajustar outra refeição se quiser.`;

  appendChatBotMessage(
    `Pronto! O ${meal.name.toLowerCase()} agora é “${recipe.title}”.\nSeu dia ficou com ${formatNumber(totals.kcal)} kcal — ${balance}`,
    [
      { action: "recipe", recipeId: recipe.id, label: "Ver receita", icon: "arrow-up-right" },
      { action: "navigate", route: "meu-dia", label: "Ver meu dia", icon: "home" },
      { action: "swap", meal: meal.id, label: "Trocar de novo", icon: "swap" }
    ],
    ["Quantas calorias faltam?", "O que tem no jantar?", "Ver meu dia"]
  );
}

function handleChatAction(messageIndex, actionIndex) {
  const message = chatState.messages[messageIndex];
  const action = message && Array.isArray(message.actions) ? message.actions[actionIndex] : null;
  if (!action) return;

  if (action.action === "navigate") {
    navigateFromChat(action.route, { filter: action.filter || null, scope: action.scope || null });
    return;
  }

  if (action.action === "swap") {
    closeChat({ restoreFocus: false });
    openSwapModal(action.meal || "jantar");
    return;
  }

  if (action.action === "recipe") {
    closeChat({ restoreFocus: false });
    openRecipe(action.recipeId);
    return;
  }

  if (action.action === "profile") {
    closeChat({ restoreFocus: false });
    openProfileModal();
    return;
  }

  if (action.action === "water") {
    handleChatWater();
    return;
  }

  if (action.action === "set-recipe") {
    handleChatSetRecipe(action.meal, action.recipeId);
    return;
  }

  if (action.action === "search") {
    searchFromChat(action.query || "");
  }

  if (action.action === "retry") {
    sendChatMessage(action.question || "");
  }
}

/* =========================================================
   Ações
   ========================================================= */

function openRecipeAndAdd(recipeId) {
  const select = document.getElementById("detail-meal-select");
  const mealId = select ? select.value : getRecipe(recipeId)?.meal;
  if (!mealId) return;
  const meal = mealById(mealId);
  const recipe = getRecipe(recipeId);
  if (!recipe || !setRecipeForMeal(ui.selectedDate, mealId, recipeId)) return;

  closeModal();
  syncChrome();
  refreshCurrentRoute({ keepScroll: true });
  showToast(`${meal.name}: ${recipe.title} entrou no seu plano.`, "check");
}

function selectSwap(recipeId, mealId) {
  const recipe = getRecipe(recipeId);
  const meal = mealById(mealId);
  if (!recipe || !setRecipeForMeal(ui.selectedDate, mealId, recipeId)) return;

  closeModal();
  refreshDashboard({ keepScroll: true });
  showToast(`Troca feita: ${recipe.title}.`, "swap");
}

function setWater(value) {
  const goal = state.profile.waterGoal;
  const next = clamp(Number(value), 0, goal);
  state.water[ui.selectedDate] = next;
  saveState();
  updateWaterCard();
  if (chatState.open) updateChatContext();
  if (next >= goal) showToast("Meta de hidratação concluída. Muito bem!", "drop");
}

function addWater() {
  const current = Number(state.water[ui.selectedDate] || 0);
  if (current >= state.profile.waterGoal) {
    showToast("Sua meta de água já está concluída.", "drop");
    return;
  }
  setWater(current + 1);
}

function toggleMealDone(mealId) {
  const iso = ui.selectedDate;
  if (!state.done[iso]) state.done[iso] = {};
  state.done[iso][mealId] = !state.done[iso][mealId];
  if (!state.done[iso][mealId]) delete state.done[iso][mealId];
  saveState();

  const button = document.querySelector(`[data-done="${mealId}"]`);
  const card = document.querySelector(`[data-meal-card="${mealId}"]`);
  if (button) {
    const done = Boolean(state.done[iso][mealId]);
    button.classList.toggle("is-done", done);
    button.setAttribute("aria-pressed", String(done));
    const label = button.querySelector("[data-done-label]");
    if (label) label.textContent = done ? "Feita" : "Marcar feita";
    card?.classList.toggle("is-done", done);
  }

  if (chatState.open) updateChatContext();
  showToast(state.done[iso][mealId] ? "Refeição registrada." : "Registro removido.", "check");
}

function goToDate(iso) {
  ui.selectedDate = iso;
  if (ui.route !== "meu-dia") navigate("meu-dia");
  else refreshDashboard({ keepScroll: true });
}

function goToSearch() {
  ui.filter = "all";
  ui.search = "";
  if (ui.route !== "receitas") {
    navigate("receitas");
    window.setTimeout(() => document.getElementById("recipe-search")?.focus(), 120);
  } else {
    renderRecipesPage();
    requestAnimationFrame(() => {
      const input = document.getElementById("recipe-search");
      input?.focus();
      input?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }
}

/* =========================================================
   Eventos
   ========================================================= */

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target;

    if (target.closest("#chat-fab")) {
      openChat();
      return;
    }

    if (target.closest("[data-chat-close]")) {
      closeChat();
      return;
    }

    if (target.closest("[data-chat-clear]")) {
      resetChatConversation();
      return;
    }

    const quickReply = target.closest("[data-chat-quick]");
    if (quickReply) {
      const index = Number(quickReply.dataset.chatQuick);
      const message = chatState.quickReplies[index];
      if (message) sendChatMessage(message);
      return;
    }

    const chatAction = target.closest("[data-chat-action-index]");
    if (chatAction) {
      handleChatAction(Number(chatAction.dataset.chatMessageIndex), Number(chatAction.dataset.chatActionIndex));
      return;
    }

    if (target.matches("[data-modal-backdrop]")) {
      closeModal();
      return;
    }

    if (target.closest("[data-close-modal]")) {
      closeModal();
      return;
    }

    if (target.closest("#profile-sidebar") || target.closest("#profile-top") || target.closest("#edit-plan")) {
      event.preventDefault();
      openProfileModal();
      return;
    }

    if (target.closest("#top-search")) {
      event.preventDefault();
      goToSearch();
      return;
    }

    const datePrev = target.closest("[data-date-prev]");
    if (datePrev) {
      ui.selectedDate = addDays(ui.selectedDate, -1);
      refreshDashboard({ keepScroll: true });
      return;
    }

    const dateNext = target.closest("[data-date-next]");
    if (dateNext) {
      ui.selectedDate = addDays(ui.selectedDate, 1);
      refreshDashboard({ keepScroll: true });
      return;
    }

    if (target.closest("[data-date-today]")) {
      ui.selectedDate = todayIso();
      refreshDashboard({ keepScroll: true });
      return;
    }

    const waterButton = target.closest("[data-water]");
    if (waterButton) {
      const value = Number(waterButton.dataset.water);
      const current = Number(state.water[ui.selectedDate] || 0);
      setWater(value === current && value > 0 ? value - 1 : value);
      return;
    }

    if (target.closest("[data-water-add]")) {
      addWater();
      return;
    }

    const done = target.closest("[data-done]");
    if (done) {
      toggleMealDone(done.dataset.done);
      return;
    }

    const swap = target.closest("[data-swap]");
    if (swap) {
      openSwapModal(swap.dataset.swap);
      return;
    }

    const fav = target.closest("[data-fav]");
    if (fav) {
      event.preventDefault();
      toggleFavorite(fav.dataset.fav);
      return;
    }

    const open = target.closest("[data-open-recipe]");
    if (open) {
      const article = open.closest("[data-meal-card]");
      const contextMeal = open.dataset.meal || article?.dataset.mealCard || null;
      openRecipe(open.dataset.openRecipe, contextMeal);
      return;
    }

    const pick = target.closest("[data-pick-recipe]");
    if (pick) {
      selectSwap(pick.dataset.pickRecipe, pick.dataset.pickMeal);
      return;
    }

    const addRecipe = target.closest("[data-add-recipe]");
    if (addRecipe) {
      openRecipeAndAdd(addRecipe.dataset.addRecipe);
      return;
    }

    const filter = target.closest("[data-filter]");
    if (filter) {
      ui.filter = filter.dataset.filter;
      updateRecipeGrid();
      return;
    }

    const scope = target.closest("[data-scope]");
    if (scope) {
      if (ui.shoppingScope !== scope.dataset.scope) {
        ui.shoppingScope = scope.dataset.scope;
        refreshCurrentRoute({ keepScroll: true });
      }
      return;
    }

    if (target.closest("[data-randomize]")) {
      randomizeWeek();
      return;
    }

    const openDay = target.closest("[data-open-day]");
    if (openDay) {
      ui.selectedDate = openDay.dataset.openDay;
      navigate("meu-dia");
      return;
    }

    const goDate = target.closest("[data-go-date]");
    if (goDate) {
      goToDate(goDate.dataset.goDate);
      return;
    }

    const tip = target.closest("[data-tip-filter]");
    if (tip) {
      ui.filter = tip.dataset.tipFilter;
      ui.search = "";
      navigate("receitas");
      return;
    }

    if (target.closest("[data-mark-all]")) {
      const inputs = [...document.querySelectorAll("[data-shop-check]")];
      const allChecked = inputs.length > 0 && inputs.every((input) => input.checked);
      toggleAllShopping(!allChecked);
      return;
    }

    const removeItem = target.closest("[data-remove-custom]");
    if (removeItem) {
      event.preventDefault();
      const id = removeItem.dataset.removeCustom;
      state.customShopping = state.customShopping.filter((item) => item.id !== id);
      state.checkedShopping = state.checkedShopping.filter((key) => !key.endsWith(`m:${id}`));
      saveState();
      refreshCurrentRoute({ keepScroll: true });
      showToast("Item removido da lista.", "trash");
      return;
    }

    const reset = target.closest("[data-reset-profile]");
    if (reset) {
      event.preventDefault();
      if (reset.dataset.confirm === "1") {
        resetAllData();
        return;
      }
      reset.dataset.confirm = "1";
      reset.textContent = "Clique de novo para confirmar";
      window.clearTimeout(resetConfirmTimer);
      resetConfirmTimer = window.setTimeout(() => {
        if (!document.body.contains(reset)) return;
        reset.dataset.confirm = "";
        reset.textContent = "Redefinir dados";
      }, 4000);
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "chat-form") {
      event.preventDefault();
      sendChatMessage(chatInput.value);
      return;
    }

    if (event.target.id === "profile-form") {
      event.preventDefault();
      handleProfileSubmit(event.target);
      return;
    }

    if (event.target.id === "add-item-form") {
      event.preventDefault();
      const input = event.target.querySelector('[name="item"]');
      if (!input) return;
      addCustomShoppingItem(input.value);
      input.value = "";
    }
  });

  document.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-shop-check]");
    if (checkbox) {
      const key = checkbox.dataset.shopCheck;
      if (checkbox.checked) {
        if (!state.checkedShopping.includes(key)) state.checkedShopping.push(key);
      } else {
        state.checkedShopping = state.checkedShopping.filter((item) => item !== key);
      }
      saveState();
      checkbox.closest(".shop-item")?.classList.toggle("checked", checkbox.checked);
      updateShoppingProgressUI();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatState.open && !document.body.classList.contains("modal-open")) {
      event.preventDefault();
      closeChat();
      return;
    }

    if (!document.body.classList.contains("modal-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      const modal = modalRoot.querySelector(".modal");
      if (!modal) return;
      const focusable = [...modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener("hashchange", () => {
    closeModal();
    renderRoute({ scrollTop: true });
  });
}

/* =========================================================
   Inicialização
   ========================================================= */

function init() {
  if (!window.location.hash) {
    history.replaceState(null, "", "#/meu-dia");
  }
  bindEvents();
  setupChatComposerTools();
  syncChrome();
  renderRoute({ scrollTop: false });
  detectChatBackend();
}

init();
