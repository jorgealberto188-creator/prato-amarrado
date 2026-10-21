/* =========================================================
   Nina — assistente contextual do Prato Amarrado.
   Motor local de intenções: funciona offline, sem enviar dados.
   ========================================================= */

(function () {
  "use strict";

  const MEAL_WORDS = [
    { id: "cafe", pattern: /\b(cafe|manha|breakfast)\b/ },
    { id: "almoco", pattern: /\b(almoco|almocar|meio dia|lunch)\b/ },
    { id: "lanche", pattern: /\b(lanche|tarde|snack)\b/ },
    { id: "jantar", pattern: /\b(jantar|janta|noite|dinner)\b/ }
  ];

  const STOP_WORDS = new Set([
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
    "por", "para", "com", "sem", "e", "ou", "que", "qual", "quais", "como", "onde", "quando", "porque", "sobre",
    "eu", "me", "meu", "minha", "meus", "minhas", "voce", "seu", "sua", "te", "se", "isso", "essa", "esse", "aquele",
    "quero", "queria", "gostaria", "preciso", "posso", "pode", "poderia", "vou", "estou", "esta", "tem", "ha",
    "fazer", "ver", "mostrar", "mostra", "abrir", "ir", "ajuda", "ajudar", "receita", "receitas", "comida", "prato",
    "algo", "algum", "alguma", "mais", "menos", "muito", "pouco", "hoje", "agora", "dia", "refeicao", "refeicoes",
    "cafe", "manha", "almoco", "lanche", "tarde", "jantar", "noite", "leve", "leveza", "light", "caloria", "calorias",
    "kcal", "proteico", "proteica", "proteina", "proteinas", "vegetariano", "vegetariana", "vegano", "vegana",
    "carne", "rapido", "rapida", "pratico", "pratica", "sugere", "sugerir", "sugestao", "sugestoes", "opcao",
    "opcoes", "ideia", "ideias", "recomenda", "recomendar", "indica", "indicar", "comer", "quero", "favor",
    "favorita", "favoritas", "cardapio", "plano", "semana", "hoje", "tudo", "bem", "boa", "bom", "oi", "ola",
    "nina", "voce", "seu", "sua", "esta", "estou", "me", "ajudar", "escolher", "montar", "trocar"
  ]);

  const SAFETY_PATTERN = /(alergi|intoler|celiac|sem gluten|sem lactose|anafil|restricao alimentar)/;
  const THANKS_PATTERN = /(obrigad|valeu|agradec|brigad)/;
  const BYE_PATTERN = /(tchau|ate mais|adeus|ate logo)/;
  const GREETING_PATTERN = /^(oi|ola|opa|eai|e ai|bom dia|boa tarde|boa noite|tudo bem|como vai)/;

  function normalize(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectMeal(text) {
    for (const entry of MEAL_WORDS) {
      if (entry.pattern.test(text)) return entry.id;
    }
    return null;
  }

  function mealName(mealId) {
    const meal = MEALS.find((item) => item.id === mealId);
    return meal ? meal.name : "refeição";
  }

  function mealTime(mealId) {
    const meal = MEALS.find((item) => item.id === mealId);
    return meal ? meal.time : "";
  }

  function entryFor(ctx, mealId) {
    return ctx.entries.find((entry) => entry.mealId === mealId) || null;
  }

  function shortTitle(title, max = 27) {
    if (!title) return "";
    return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
  }

  function asCount(value, singular, plural) {
    return `${value} ${value === 1 ? singular : plural}`;
  }

  function signedRemaining(remaining) {
    if (remaining > 0) return `${remaining} kcal de margem`;
    if (remaining < 0) return `${Math.abs(remaining)} kcal acima da meta`;
    return "na meta exata";
  }

  function whenLabel(ctx) {
    return ctx.isToday ? "de hoje" : `de ${ctx.weekday}`;
  }

  function currentMealForQuestion(ctx, mealId) {
    return entryFor(ctx, mealId);
  }

  function nextMeal(ctx) {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const withMinutes = ctx.entries
      .map((entry) => {
        const [hour, minute] = entry.mealTime.split(":").map(Number);
        return { ...entry, minutes: hour * 60 + minute };
      })
      .sort((a, b) => a.minutes - b.minutes);
    if (!withMinutes.length) return null;
    return withMinutes.find((entry) => entry.minutes >= minutes) || withMinutes[0];
  }

  function actionGo(route, label, icon = "arrow-right", extra = {}) {
    return { action: "navigate", route, label, icon, ...extra };
  }

  function actionRecipe(recipe, label) {
    return { action: "recipe", recipeId: recipe.id, label: label || `Abrir ${shortTitle(recipe.title)}`, icon: "arrow-up-right" };
  }

  function actionSwap(mealId, label = "Comparar no app") {
    return { action: "swap", meal: mealId, label, icon: "swap" };
  }

  function actionUse(recipe, mealId) {
    return { action: "set-recipe", recipeId: recipe.id, meal: mealId, label: `Usar ${shortTitle(recipe.title, 24)}`, icon: "plus" };
  }

  function actionProfile(label = "Ajustar meu perfil") {
    return { action: "profile", label, icon: "sliders" };
  }

  function actionWater(label = "Registrar 1 copo") {
    return { action: "water", label, icon: "plus" };
  }

  function actionSearch(query, label = "Ver na biblioteca") {
    return { action: "search", query, label, icon: "search" };
  }

  function defaultQuickReplies() {
    return [
      "O que tem no almoço?",
      "Quero algo leve para o jantar",
      "Quantas calorias faltam?",
      "Como funciona o app?"
    ];
  }

  function welcome(ctx) {
    return {
      text: `Oi, ${ctx.name}! Eu sou a Nina, assistente do Prato Amarrado.\nPosso te ajudar a entender seu dia, escolher ou trocar uma receita, registrar água e encontrar o que precisa no app. Você também pode falar pelo microfone ou anexar uma foto da refeição para eu analisar. Por onde começamos?`,
      actions: [
        actionGo("meu-dia", "Ver meu dia", "home"),
        actionGo("receitas", "Explorar receitas", "book"),
        actionProfile("Ajustar metas")
      ],
      quickReplies: defaultQuickReplies(),
      topic: "welcome",
      session: {}
    };
  }

  function greeting(ctx) {
    return {
      text: `Oi, ${ctx.name}! Estou por aqui.\nSeu plano ${ctx.isToday ? "de hoje" : `de ${ctx.weekday}`} soma ${ctx.totals.kcal.toLocaleString("pt-BR")} kcal — ${signedRemaining(ctx.remaining)}. Quer entender uma refeição ou escolher algo novo?`,
      actions: [
        actionGo("meu-dia", "Abrir meu dia", "home"),
        actionSwap(nextMeal(ctx)?.mealId || "jantar", "Trocar uma refeição")
      ],
      quickReplies: ["O que tem hoje?", "Sugere algo leve", "Quero trocar o jantar"],
      topic: "greeting",
      session: {}
    };
  }

  function help(ctx) {
    return {
      text: `Eu sou um guia dentro do Prato Amarrado. Posso:\n• explicar suas calorias, macros e refeições;\n• sugerir receitas por refeição, ingrediente ou preferência;\n• trocar uma refeição com um clique;\n• abrir a lista de compras, registrar água e ajustar suas metas.\n\nÉ só perguntar do seu jeito — sem comando especial.`,
      actions: [
        actionGo("receitas", "Ver receitas", "book"),
        actionGo("semana", "Plano semanal", "calendar"),
        actionGo("compras", "Lista de compras", "bag")
      ],
      quickReplies: ["O que tem hoje?", "Como troco uma receita?", "Quantas calorias faltam?", "Como registro água?"],
      topic: "help",
      session: {}
    };
  }

  function calories(ctx, text) {
    const wantsProtein = /(proteina|proteinas|proteico)/.test(text);
    const wantsCarbs = /(carboidrato|carboidratos|carbo)/.test(text);
    const wantsFat = /(gordura|gorduras)/.test(text);
    const when = whenLabel(ctx);
    const header = ctx.remaining >= 0
      ? `Seu plano ${when} soma ${ctx.totals.kcal.toLocaleString("pt-BR")} kcal, ${ctx.pct}% da meta de ${ctx.profile.calories.toLocaleString("pt-BR")}. Ainda há ${ctx.remaining} kcal de margem.`
      : `Seu plano ${when} soma ${ctx.totals.kcal.toLocaleString("pt-BR")} kcal e passou ${Math.abs(ctx.remaining)} kcal da meta de ${ctx.profile.calories.toLocaleString("pt-BR")}. Dá para ajustar trocando uma refeição.`;

    let detail = `Proteína: ${ctx.totals.protein} g de ${ctx.profile.protein} g. Carboidratos: ${ctx.totals.carbs} g de ${ctx.profile.carbs} g. Gorduras: ${ctx.totals.fat} g de ${ctx.profile.fat} g.`;
    if (wantsProtein && !wantsCarbs && !wantsFat) {
      const richest = [...ctx.entries].sort((a, b) => b.protein - a.protein)[0];
      detail = `A proteína do dia está em ${ctx.totals.protein} g, ${Math.round((ctx.totals.protein / ctx.profile.protein) * 100)}% da meta de ${ctx.profile.protein} g.${richest ? ` O prato com mais proteína é ${richest.title}, com ${richest.protein} g.` : ""}`;
    } else if (wantsCarbs && !wantsProtein && !wantsFat) {
      detail = `Os carboidratos do dia somam ${ctx.totals.carbs} g, ${Math.round((ctx.totals.carbs / ctx.profile.carbs) * 100)}% da meta de ${ctx.profile.carbs} g.`;
    } else if (wantsFat && !wantsProtein && !wantsCarbs) {
      detail = `As gorduras do dia somam ${ctx.totals.fat} g, ${Math.round((ctx.totals.fat / ctx.profile.fat) * 100)}% da meta de ${ctx.profile.fat} g.`;
    }

    return {
      text: `${header}\n${detail}`,
      actions: [
        actionGo("meu-dia", "Ver meu dia", "home"),
        actionProfile("Ajustar metas"),
        actionWater()
      ],
      quickReplies: ["O que tem no jantar?", "Sugere um lanche leve", "Como está minha semana?"],
      topic: "calories",
      session: {}
    };
  }

  function describeMeal(ctx, mealId) {
    const entry = currentMealForQuestion(ctx, mealId);
    if (!entry) {
      return {
        text: `Não encontrei ${mealName(mealId).toLowerCase()} no plano ${whenLabel(ctx)}.`,
        actions: [actionGo("meu-dia", "Abrir meu dia", "home")],
        quickReplies: defaultQuickReplies(),
        topic: "meal",
        session: {}
      };
    }
    return {
      text: `No ${entry.mealName.toLowerCase()} ${whenLabel(ctx)} está “${entry.title}”.\n${entry.kcal.toLocaleString("pt-BR")} kcal · ${entry.protein} g de proteína · ${entry.recipeTime} min.\n\nQuer ver a ficha completa ou trocar por outra opção?`,
      actions: [
        actionRecipe(entry.recipe),
        actionSwap(mealId, "Trocar esta refeição")
      ],
      quickReplies: ["Ver ingredientes", "Quero trocar", "O que tem hoje?"],
      topic: "meal",
      session: { lastMeal: mealId }
    };
  }

  function mealCalories(ctx, mealId) {
    const entry = entryFor(ctx, mealId);
    if (!entry) return describeMeal(ctx, mealId);
    return {
      text: `O ${entry.mealName.toLowerCase()} é “${entry.title}”.\n${entry.kcal.toLocaleString("pt-BR")} kcal · ${entry.protein} g de proteína · ${entry.carbs} g de carboidratos · ${entry.fat} g de gorduras.\n\nQuer abrir a receita ou ver outras opções?`,
      actions: [actionRecipe(entry.recipe), actionSwap(mealId, "Ver outras opções")],
      quickReplies: ["Quero trocar", "Ver ingredientes", "Quantas calorias faltam?"],
      topic: "meal-macros",
      session: { lastMeal: mealId }
    };
  }

  function daySummary(ctx) {
    const lines = ctx.entries.map((entry) =>
      `• ${entry.mealName}, ${entry.mealTime} — ${entry.title} (${entry.kcal.toLocaleString("pt-BR")} kcal)`
    );
    return {
      text: `Seu cardápio ${whenLabel(ctx)} está assim:\n${lines.join("\n")}\n\nTotal: ${ctx.totals.kcal.toLocaleString("pt-BR")} kcal, ${signedRemaining(ctx.remaining)}.`,
      actions: [
        actionGo("meu-dia", "Ver cardápio completo", "home"),
        actionGo("semana", "Ver a semana", "calendar")
      ],
      quickReplies: ["Trocar o café", "Trocar o almoço", "Trocar o lanche", "Trocar o jantar"],
      topic: "day-summary",
      session: {}
    };
  }

  function tokensFrom(text) {
    return normalize(text)
      .split(" ")
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
  }

  function recipeScore(recipe, tokens) {
    const title = normalize(recipe.title);
    const ingredients = normalize(recipe.ingredients.map((ingredient) => ingredient.name).join(" "));
    const tags = normalize(recipe.tags.join(" "));
    const subtitle = normalize(recipe.subtitle);
    let score = 0;
    tokens.forEach((token) => {
      if (title.includes(token)) score += 4;
      if (ingredients.includes(token)) score += 3;
      if (tags.includes(token)) score += 2;
      if (subtitle.includes(token)) score += 1;
    });
    return score;
  }

  function preferenceFlags(text) {
    return {
      light: /(leve|leveza|light|menos caloria|pouca caloria|baixa caloria|caloria baixa)/.test(text),
      protein: /(proteic|proteina|mais proteina|forca|saciedade)/.test(text),
      quick: /(rapid|pratic|pouco tempo|sem tempo|corrido)/.test(text),
      vegetarian: /(vegetarian|vegan|sem carne)/.test(text),
      sweet: /(doce|sobremesa|chocolate|cacau)/.test(text)
    };
  }

  function filteredOptions(ctx, mealId, text, excludeIds = []) {
    const flags = preferenceFlags(text);
    const tokens = tokensFrom(text);
    let pool = mealId ? RECIPES.filter((recipe) => recipe.meal === mealId) : [...RECIPES];
    const currentId = mealId ? entryFor(ctx, mealId)?.recipeId : null;
    const excluded = new Set([...excludeIds, ...(currentId ? [currentId] : [])]);

    if (flags.vegetarian) {
      const veg = pool.filter((recipe) => recipe.tags.includes("Vegetariano"));
      if (veg.length) pool = veg;
    }

    if (flags.sweet) {
      const sweet = pool.filter((recipe) => recipe.tags.includes("Doce") || /(cacau|banana|frutas vermelhas|mel)/.test(recipe.ingredients.map((i) => i.name).join(" ")));
      if (sweet.length) pool = sweet;
    }

    if (tokens.length) {
      const scored = pool
        .map((recipe) => ({ recipe, score: recipeScore(recipe, tokens) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
      if (scored.length) pool = scored.map((item) => item.recipe);
    }

    pool = pool.filter((recipe) => !excluded.has(recipe.id));

    if (flags.protein) pool.sort((a, b) => b.protein - a.protein);
    else if (flags.light) pool.sort((a, b) => a.kcal - b.kcal);
    else if (flags.quick) pool.sort((a, b) => a.time - b.time);

    if (!pool.length) {
      pool = (mealId ? RECIPES.filter((recipe) => recipe.meal === mealId) : RECIPES)
        .filter((recipe) => !excluded.has(recipe.id));
    }
    return { recipes: pool, flags, tokens };
  }

  function swapSuggestions(ctx, mealId, session = {}, text = "") {
    if (!mealId) {
      return {
        text: "Claro. Qual refeição você quer trocar?",
        actions: [],
        quickReplies: ["Trocar o café", "Trocar o almoço", "Trocar o lanche", "Trocar o jantar"],
        topic: "swap-ask-meal",
        session: {}
      };
    }

    const isMore = /(mais opcoes|outras opcoes|mais sugestoes|outra sugestao|outra ideia)/.test(text);
    const exclude = isMore ? (session.lastRecipeIds || []) : [];
    const { recipes, flags } = filteredOptions(ctx, mealId, `${text} ${session.lastPreference || ""}`, exclude);
    const options = recipes.slice(0, 2);
    if (!options.length) {
      return {
        text: `Não encontrei outra opção de ${mealName(mealId).toLowerCase()} que combine com o pedido. Você pode abrir a troca completa para ver todas as opções.`,
        actions: [actionSwap(mealId)],
        quickReplies: ["Ver meu dia", "Sugere um jantar"],
        topic: "swap-empty",
        session: { lastMeal: mealId }
      };
    }

    const preferenceLabel = flags.light ? "mais leve" : flags.protein ? "com mais proteína" : flags.quick ? "mais rápida" : flags.vegetarian ? "vegetariana" : "";
    const intro = isMore
      ? "Claro, separei outras opções:"
      : `Para o ${mealName(mealId).toLowerCase()}, ${preferenceLabel ? `pensando em algo ${preferenceLabel}, ` : ""}eu sugeriria:`;

    const lines = options.map((recipe) =>
      `• ${recipe.title} — ${recipe.kcal.toLocaleString("pt-BR")} kcal · ${recipe.protein} g de proteína · ${recipe.time} min`
    );

    return {
      text: `${intro}\n${lines.join("\n")}\n\nPosso trocar direto ou você pode comparar todas as opções no app.`,
      actions: [
        ...options.map((recipe) => actionUse(recipe, mealId)),
        actionSwap(mealId, "Comparar no app")
      ],
      quickReplies: ["Mais opções", "Ver meu dia", "O que tem no lanche?"],
      topic: "swap",
      session: {
        lastMeal: mealId,
        lastRecipeIds: options.map((recipe) => recipe.id),
        lastPreference: flags.light ? "leve" : flags.protein ? "proteico" : flags.quick ? "rapido" : ""
      }
    };
  }

  function recipeIdeas(ctx, text, mealId) {
    const rawTokens = tokensFrom(text);
    const targetMeal = mealId || (rawTokens.length ? null : (nextMeal(ctx)?.mealId || "jantar"));
    const { recipes, flags, tokens } = filteredOptions(ctx, targetMeal, text, []);
    const options = recipes.slice(0, 2);
    if (!options.length) {
      return {
        text: "Não encontrei uma receita com esses termos. Você pode buscar por ingrediente na biblioteca ou me pedir por refeição — como “algo leve para o jantar”.",
        actions: [actionGo("receitas", "Abrir biblioteca", "book")],
        quickReplies: defaultQuickReplies(),
        topic: "recipe-empty",
        session: {}
      };
    }

    const queryLabel = tokens.length ? ` com ${tokens.join(" ")}` : "";
    const prefLabel = flags.light ? "leves" : flags.protein ? "ricas em proteína" : flags.quick ? "rápidas" : flags.vegetarian ? "vegetarianas" : "";
    const mealLabel = targetMeal ? ` para o ${mealName(targetMeal).toLowerCase()}` : "";
    const heading = queryLabel
      ? `Encontrei ${asCount(options.length, "receita", "receitas")}${queryLabel}:`
      : `Separei ${asCount(options.length, "ideia", "ideias")}${prefLabel ? ` ${prefLabel}` : ""}${mealLabel}:`;
    const lines = options.map((recipe) =>
      `• ${recipe.title} — ${recipe.kcal.toLocaleString("pt-BR")} kcal · ${recipe.protein} g de proteína · ${recipe.time} min`
    );

    return {
      text: `${heading}\n${lines.join("\n")}\n\nQuer abrir uma ficha? Dentro dela você também pode adicionar ao dia.`,
      actions: [
        ...options.map((recipe) => actionRecipe(recipe, `Abrir ${shortTitle(recipe.title, 23)}`)),
        actionGo("receitas", "Ver biblioteca", "book")
      ],
      quickReplies: targetMeal
        ? ["Mais opções", "Quero trocar o jantar", "Ver meu dia"]
        : ["Quero trocar o jantar", "Ver meu dia", "Quantas calorias faltam?"],
      topic: "recipe-ideas",
      session: {
        lastMeal: targetMeal,
        lastRecipeIds: options.map((recipe) => recipe.id)
      }
    };
  }

  function water(ctx) {
    const done = ctx.water.current >= ctx.water.goal;
    return {
      text: done
        ? `Você já completou sua meta de água: ${ctx.water.current} de ${ctx.water.goal} copos. Que tal manter o ritmo?`
        : `Você registrou ${ctx.water.current} de ${ctx.water.goal} copos hoje. Faltam ${ctx.water.goal - ctx.water.current} copos (${((ctx.water.goal - ctx.water.current) * 250).toLocaleString("pt-BR")} ml).\nQuer registrar mais um agora?`,
      actions: [
        ...(done ? [] : [actionWater()]),
        actionGo("meu-dia", "Ver meu dia", "home")
      ],
      quickReplies: ["Quantas calorias faltam?", "O que tem no jantar?", "Como funciona o app?"],
      topic: "water",
      session: {}
    };
  }

  function shopping(ctx) {
    const checked = ctx.shopping.checked;
    const pending = ctx.shopping.pending;
    const preview = ctx.shopping.preview || [];
    const lines = preview.length
      ? `\nPrimeiros pendentes: ${preview.map((item) => `${item.name}${item.qty ? ` (${item.qty})` : ""}`).join(", ")}.`
      : "";
    return {
      text: `Sua lista da semana tem ${asCount(ctx.shopping.total, "item", "itens")}: ${checked} marcados e ${pending} pendentes.${lines}`,
      actions: [
        actionGo("compras", "Abrir lista da semana", "cart"),
        actionGo("compras", "Ver lista de hoje", "bag", { scope: "day" }),
        actionGo("semana", "Revisar o plano", "calendar")
      ],
      quickReplies: ["O que falta na lista?", "Quantas calorias faltam?", "Ver meu dia"],
      topic: "shopping",
      session: {}
    };
  }

  function week(ctx) {
    return {
      text: `Sua semana de ${ctx.weekRange} tem média de ${ctx.week.average.toLocaleString("pt-BR")} kcal por dia, ${ctx.week.averagePct}% da meta, e ${asCount(ctx.week.uniqueRecipes, "receita diferente", "receitas diferentes")}.\nO dia de hoje está em ${ctx.pct}% da meta.`,
      actions: [
        actionGo("semana", "Abrir plano semanal", "calendar"),
        actionGo("compras", "Ver lista de compras", "bag")
      ],
      quickReplies: ["O que tem hoje?", "Quero variar o cardápio", "Quantas calorias faltam?"],
      topic: "week",
      session: {}
    };
  }

  function profile(ctx) {
    return {
      text: `Suas metas atuais são ${ctx.profile.calories.toLocaleString("pt-BR")} kcal por dia, ${ctx.profile.protein} g de proteína e ${ctx.profile.waterGoal} copos de água.\nNo perfil você pode ajustar nome, objetivo e metas. A distribuição dos macros acompanha a nova meta calórica.`,
      actions: [actionProfile(), actionGo("meu-dia", "Ver meu dia", "home")],
      quickReplies: ["Quantas calorias faltam?", "Como registro água?", "O que tem no almoço?"],
      topic: "profile",
      session: {}
    };
  }

  function nextMealReply(ctx) {
    const entry = nextMeal(ctx);
    if (!entry) return fallback(ctx);
    const now = new Date();
    const [hour, minute] = entry.mealTime.split(":").map(Number);
    const upcoming = hour * 60 + minute >= now.getHours() * 60 + now.getMinutes();
    return {
      text: upcoming
        ? `A próxima refeição é o ${entry.mealName.toLowerCase()}, às ${entry.mealTime}: “${entry.title}”.\n${entry.kcal.toLocaleString("pt-BR")} kcal · ${entry.protein} g de proteína · ${entry.recipeTime} min.`
        : `As refeições de hoje já passaram. O próximo café da manhã é amanhã, às 08:00. O de hoje era “${entry.title}”.`,
      actions: [actionRecipe(entry.recipe), actionSwap(entry.mealId, "Trocar esta refeição")],
      quickReplies: ["Ver meu dia", "Quantas calorias faltam?", "Quero algo leve para o jantar"],
      topic: "next-meal",
      session: { lastMeal: entry.mealId }
    };
  }

  function howToSwap(ctx) {
    return {
      text: "Para trocar uma receita, você tem dois caminhos:\n1. No seu dia, toque em “Trocar” na refeição desejada e escolha outra opção.\n2. Aqui no chat, me diga por exemplo “quero trocar o jantar” — eu mostro opções e posso aplicar direto.\n\nAs calorias e os macros do dia se ajustam na hora.",
      actions: [
        actionSwap(nextMeal(ctx)?.mealId || "jantar", "Abrir troca agora"),
        actionGo("meu-dia", "Ver meu dia", "home")
      ],
      quickReplies: ["Quero trocar o jantar", "Quero trocar o almoço", "Ver receitas"],
      topic: "how-to-swap",
      session: {}
    };
  }

  function safety(ctx) {
    return {
      text: "Eu não consigo verificar alergênicos ou substituições clínicas com segurança, então não use minhas sugestões como garantia.\nConfira sempre os ingredientes e rótulos dos produtos. Se você tem alergia, intolerância ou condição de saúde, siga a orientação de um nutricionista ou médico.",
      actions: [
        actionGo("receitas", "Ver receitas", "book"),
        actionProfile("Revisar meu perfil")
      ],
      quickReplies: ["O que tem no almoço?", "Como funciona o app?", "Quantas calorias faltam?"],
      topic: "safety",
      session: {}
    };
  }

  function weightGoal(ctx) {
    return {
      text: `Posso te ajudar a organizar o dia, mas não sei seu histórico clínico para definir uma meta de emagrecimento. O ideal é alinhar isso com um nutricionista.\nSeu plano atual soma ${ctx.totals.kcal.toLocaleString("pt-BR")} kcal, ${signedRemaining(ctx.remaining)}. Você pode ajustar a meta calórica no perfil quando quiser.`,
      actions: [
        actionProfile("Ajustar minha meta"),
        actionGo("meu-dia", "Ver meu dia", "home")
      ],
      quickReplies: ["Quantas calorias faltam?", "Quero algo leve para o jantar", "Como funciona o app?"],
      topic: "weight-goal",
      session: {}
    };
  }

  function favorites(ctx) {
    const count = ctx.favoritesCount;
    return {
      text: count
        ? `Você tem ${asCount(count, "receita favorita", "receitas favoritas")} guardada${count === 1 ? "" : "s"}. Posso abrir a biblioteca já filtrada para você.`
        : "Você ainda não tem favoritas. Na biblioteca, toque no coração de qualquer receita para guardar aqui.",
      actions: [
        actionGo("receitas", count ? "Ver minhas favoritas" : "Explorar receitas", "heart", { filter: "favoritas" })
      ],
      quickReplies: ["O que tem no almoço?", "Sugere algo leve", "Quantas calorias faltam?"],
      topic: "favorites",
      session: {}
    };
  }

  function variation(ctx) {
    return {
      text: "Você pode variar os sete dias de uma vez no plano semanal. Lá, o botão “Variar cardápio” gera novas combinações e recalcula a média da semana.\nSe quiser trocar só uma refeição, eu faço isso por aqui.",
      actions: [
        actionGo("semana", "Abrir plano semanal", "calendar"),
        actionSwap(nextMeal(ctx)?.mealId || "jantar", "Trocar só uma refeição")
      ],
      quickReplies: ["Quero trocar o jantar", "Como está minha semana?", "Ver meu dia"],
      topic: "variation",
      session: {}
    };
  }

  function ingredientsReply(ctx, mealId) {
    const entry = entryFor(ctx, mealId);
    if (!entry) return describeMeal(ctx, mealId);
    const ingredientNames = entry.ingredients.map((ingredient) => ingredient.name).join(", ");
    return {
      text: `A receita de ${entry.mealName.toLowerCase()} é “${entry.title}”.\nIngredientes principais: ${ingredientNames}.\n\nAbra a ficha para ver quantidades e modo de preparo.`,
      actions: [actionRecipe(entry.recipe), actionSwap(mealId, "Trocar esta refeição")],
      quickReplies: ["Quero trocar", "Ver meu dia", "Quantas calorias faltam?"],
      topic: "ingredients",
      session: { lastMeal: mealId }
    };
  }

  function generalKnowledgeUnavailable(ctx) {
    return {
      text: "Neste modo local eu não tenho uma base de nutrição geral para estimar alimentos isolados ou responder dúvidas mais amplas de nutrição e gastronomia.\nPara isso, abra o app pelo servidor com a API DeepSeek ativa. Enquanto estou no modo local, posso te mostrar o plano e trocar receitas.",
      actions: [
        actionGo("meu-dia", "Ver meu dia", "home"),
        actionGo("receitas", "Ver receitas", "book")
      ],
      quickReplies: ["O que tem no almoço?", "Quantas calorias faltam?", "Quero trocar o jantar"],
      topic: "general-local-unavailable",
      session: {}
    };
  }

  function navigateReply(ctx) {
    return {
      text: "Consigo te levar para qualquer parte do Prato Amarrado. O que você quer abrir?",
      actions: [
        actionGo("meu-dia", "Meu dia", "home"),
        actionGo("receitas", "Receitas", "book"),
        actionGo("semana", "Plano semanal", "calendar"),
        actionGo("compras", "Lista de compras", "bag")
      ],
      quickReplies: ["O que tem hoje?", "Como funciona o app?"],
      topic: "navigate",
      session: {}
    };
  }

  function thanks(ctx) {
    return {
      text: `Por nada, ${ctx.name}! Se quiser, posso revisar seu dia, sugerir uma receita ou mostrar sua lista de compras.`,
      actions: [actionGo("meu-dia", "Ver meu dia", "home")],
      quickReplies: ["O que tem no jantar?", "Sugere um lanche", "Quantas calorias faltam?"],
      topic: "thanks",
      session: {}
    };
  }

  function goodbye() {
    return {
      text: "Até mais! Vou estar por aqui quando você precisar.",
      actions: [],
      quickReplies: [],
      topic: "goodbye",
      session: {}
    };
  }

  function fallback(ctx) {
    return {
      text: `Ainda não entendi essa, ${ctx.name}. Posso ajudar com o seu plano e calorias, escolher ou trocar receitas, registrar água, ajustar metas ou abrir a lista de compras.\nTente me dizer algo como “o que tem no almoço?” ou “sugere algo leve para o jantar”.`,
      actions: [
        actionGo("meu-dia", "Ver meu dia", "home"),
        actionGo("receitas", "Explorar receitas", "book")
      ],
      quickReplies: defaultQuickReplies(),
      topic: "fallback",
      session: {}
    };
  }

  function reply(input, ctx, session = {}) {
    const text = normalize(input);
    if (!text) return fallback(ctx);

    if (THANKS_PATTERN.test(text)) return thanks(ctx);
    if (BYE_PATTERN.test(text) && text.length < 30) return goodbye();
    if (/^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|como vai)[\s!.]*$/.test(text)) return greeting(ctx);
    if (SAFETY_PATTERN.test(text)) return safety(ctx);
    if (/(favorit)/.test(text)) return favorites(ctx);
    if (/(emagrec|perder peso|secar|dieta para|deficit)/.test(text)) return weightGoal(ctx);

    if (/(como troco|como trocar|como faco para trocar)/.test(text)
      && /(receita|refeicao|cafe|almoco|lanche|jantar|prato)/.test(text)) {
      return howToSwap(ctx);
    }

    if (/(proxima refeicao|proximo prato|qual.*proxima|o que comer agora)/.test(text)) {
      return nextMealReply(ctx);
    }

    if (/(agua|hidrat|beber|bebi|copos)/.test(text)) return water(ctx);

    if (/(lista de compras|compras|mercado|supermercado|falta na lista)/.test(text)) return shopping(ctx);

    if (/(minha semana|plano semanal|semana toda|media da semana|como esta a semana|cardapio da semana)/.test(text)) {
      return week(ctx);
    }

    if (/(variar.*(cardapio|semana)|regerar.*(cardapio|semana)|(cardapio|semana).*variar|novo cardapio)/.test(text)) {
      return variation(ctx);
    }

    if (/(perfil|minha meta|metas|objetivo|ajustar.*meta|mudar.*meta|alterar.*meta|editar.*meta|meta calorica|meta de agua)/.test(text)
      && !/(quanto|quantas|falta|saldo|bati|atingi|quanta)/.test(text)) {
      return profile(ctx);
    }

    const asksGeneralNutrition = /(caloria|calorias|kcal|proteina|carboidrato|gordura|fibra|vitamina|mineral)/.test(text)
      && !/(meu|minha|plano|meta|refeicao|refeicoes|hoje|almoco|jantar|cafe|lanche)/.test(text);
    if (asksGeneralNutrition) return generalKnowledgeUnavailable(ctx);

    const mealId = detectMeal(text);
    const wantsChange = /(trocar|troca|outra opcao|outras opcoes|alternativa|nao quero|nao gostei|sugere|sugestao|indica|quero.*(leve|proteic|rapid|diferente|novo)|opcao)/.test(text);

    if (!mealId && session.lastMeal && /(ingrediente|modo de preparo|ficha|detalhes da receita)/.test(text)) {
      return ingredientsReply(ctx, session.lastMeal);
    }

    if (!mealId && session.lastMeal && /(trocar|outra opcao|outras opcoes|alternativa|quero outra)/.test(text)) {
      return swapSuggestions(ctx, session.lastMeal, session, text);
    }

    if (mealId) {
      const asksCalories = /(caloria|kcal|proteina|macro|quanto|quantas)/.test(text);
      const asksWhat = /(o que|qual|quais|tem|mostra|ver|cardapio|como esta|me fala|descreve|ingrediente)/.test(text);

      if (wantsChange && !/(ingrediente|modo de preparo)/.test(text)) {
        if (/(mais opcoes|outras opcoes|outra sugestao)/.test(text) && session.lastMeal === mealId) {
          return swapSuggestions(ctx, mealId, session, text);
        }
        return swapSuggestions(ctx, mealId, {}, text);
      }
      if (asksCalories) return mealCalories(ctx, mealId);
      if (asksWhat || (text.split(" ").length <= 4 && !GREETING_PATTERN.test(text))) return describeMeal(ctx, mealId);
    }

    if (/(caloria|calorias|kcal|macro|macros|proteina|proteinas|carboidrato|gordura|quanto falta|quantas faltam|quanto posso|saldo do dia)/.test(text)) {
      return calories(ctx, text);
    }

    if (/(mais opcoes|outras opcoes|mais sugestoes|outra sugestao|outra ideia)/.test(text) && session.lastMeal) {
      return swapSuggestions(ctx, session.lastMeal, session, text);
    }

    const wantsRecipe = /(receita|comida|comer|sugere|sugestao|ideia|opcao|prato|algo|recomenda|indica)/.test(text);
    const preferences = preferenceFlags(text);
    const hasPreference = Object.values(preferences).some(Boolean);
    const tokens = tokensFrom(text);

    if (wantsRecipe || hasPreference || (mealId && tokens.length)) {
      return recipeIdeas(ctx, text, mealId || (preferences.sweet ? "lanche" : null));
    }

    if (/(o que tem|o que tem hoje|meu dia|cardapio de hoje|plano de hoje|refeicoes de hoje)/.test(text)) {
      return daySummary(ctx);
    }

    if (GREETING_PATTERN.test(text) || /^(oi|ola|opa|bom dia|boa tarde|boa noite|tudo bem)\b/.test(text)) {
      return greeting(ctx);
    }

    if (/(ajuda|como funciona|o que voce faz|o que voce pode|me guia|nao sei usar|onde encontro|como usar|tutorial|navegar)/.test(text)) {
      return help(ctx);
    }

    if (/(meu dia|receitas|plano semanal|lista de compras|ir para|abrir|navegar|onde fica)/.test(text)) {
      if (/(caloria|meta|macro)/.test(text)) return calories(ctx, text);
      if (/(receita)/.test(text)) return recipeIdeas(ctx, text, mealId);
      return navigateReply(ctx);
    }

    if (/(o que tem|cardapio|meu plano|meu dia|refeicoes|almoco|jantar|cafe|lanche)/.test(text)) {
      return mealId ? describeMeal(ctx, mealId) : daySummary(ctx);
    }

    return fallback(ctx);
  }

  window.PratoChat = { welcome, reply };
})();
