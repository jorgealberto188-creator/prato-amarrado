/* Prato — receitas, refeições e conteúdo do plano.
   Dados nutricionais são aproximados e servem para demonstrar o produto. */

const MEALS = [
  { id: "cafe",   name: "Café da manhã",   short: "Café",   time: "08:00", icon: "coffee", tone: "amber" },
  { id: "almoco", name: "Almoço",          short: "Almoço", time: "12:30", icon: "bowl",   tone: "green" },
  { id: "lanche", name: "Lanche da tarde", short: "Lanche", time: "16:00", icon: "apple",  tone: "peach" },
  { id: "jantar", name: "Jantar",          short: "Jantar", time: "19:30", icon: "moon",   tone: "plum"  }
];

const AISLES = ["Hortifruti", "Proteínas", "Laticínios", "Grãos e cereais", "Despensa"];

const AISLE_ICONS = {
  "Hortifruti": "leaf",
  "Proteínas": "flame",
  "Laticínios": "drop",
  "Grãos e cereais": "bowl",
  "Despensa": "bag"
};

const RECIPES = [
  {
    id: "b1",
    meal: "cafe",
    category: "Café da manhã",
    title: "Ovo mole no pão integral",
    subtitle: "Pão torrado, gema mole e tomate fresco com ervas. Simples do jeito certo.",
    image: "assets/tapioca.jpg",
    kcal: 390, protein: 20, carbs: 40, fat: 16,
    time: 15, difficulty: "Fácil",
    tags: ["Rápido", "Proteico"],
    ingredients: [
      { name: "Pão integral", qty: 2, unit: "fatias", aisle: "Grãos e cereais" },
      { name: "Ovos", qty: 2, unit: "unid.", aisle: "Proteínas" },
      { name: "Tomate", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Abacate", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Azeite", qty: 5, unit: "ml", aisle: "Despensa" },
      { name: "Orégano", qty: 0, unit: "a gosto", aisle: "Despensa" }
    ],
    steps: [
      "Toste as fatias de pão até ficarem douradas e reserve.",
      "Cozinhe os ovos em água fervente por 6 minutos e passe por água fria.",
      "Amasse o abacate com azeite, sal e pimenta. Espalhe sobre o pão.",
      "Finalize com o ovo, fatias de tomate e orégano."
    ],
    tip: "Para uma gema bem mole, conte 6 minutos a partir do momento em que a água começar a ferver."
  },
  {
    id: "b2",
    meal: "cafe",
    category: "Café da manhã",
    title: "Overnight oats de banana",
    subtitle: "Aveia cremosa, banana madura e canela para começar o dia sem pressa.",
    image: "assets/extra-oats.jpg",
    kcal: 410, protein: 16, carbs: 58, fat: 12,
    time: 10, difficulty: "Fácil",
    tags: ["Sem cozinhar", "Fibras"],
    ingredients: [
      { name: "Aveia em flocos", qty: 40, unit: "g", aisle: "Grãos e cereais" },
      { name: "Leite desnatado", qty: 150, unit: "ml", aisle: "Laticínios" },
      { name: "Iogurte natural", qty: 100, unit: "g", aisle: "Laticínios" },
      { name: "Banana", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Chia", qty: 12, unit: "g", aisle: "Despensa" },
      { name: "Canela em pó", qty: 0, unit: "a gosto", aisle: "Despensa" }
    ],
    steps: [
      "Misture a aveia, o leite, o iogurte e a chia em um pote com tampa.",
      "Deixe na geladeira por pelo menos 4 horas — ou durante a noite.",
      "Na hora de servir, cubra com a banana em rodelas e canela.",
      "Se gostar de textura mais cremosa, acrescente um fio de leite antes de comer."
    ],
    tip: "Pode preparar três potes de uma vez e deixar a semana de café da manhã resolvida."
  },
  {
    id: "b3",
    meal: "cafe",
    category: "Café da manhã",
    title: "Ovos poché com abacate",
    subtitle: "Gema cremosa, folhas verdes e um molho de limão que desperta o paladar.",
    image: "assets/ovos.jpg",
    kcal: 400, protein: 24, carbs: 16, fat: 26,
    time: 20, difficulty: "Intermediário",
    tags: ["Low carb", "Proteico"],
    ingredients: [
      { name: "Ovos", qty: 2, unit: "unid.", aisle: "Proteínas" },
      { name: "Abacate", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Mix de folhas", qty: 2, unit: "punhados", aisle: "Hortifruti" },
      { name: "Limão", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Azeite", qty: 5, unit: "ml", aisle: "Despensa" },
      { name: "Vinagre", qty: 1, unit: "col. (chá)", aisle: "Despensa" }
    ],
    steps: [
      "Aqueça água em uma panela funda e adicione o vinagre, sem deixar ferver forte.",
      "Quebre cada ovo em um copo e deslize delicadamente na água. Cozinhe por 3 minutos.",
      "Tempere o abacate com limão, sal e pimenta e distribua nas folhas.",
      "Retire os ovos com uma escumadeira e sirva sobre a salada com um fio de azeite."
    ],
    tip: "Ovos bem frescos seguram melhor a forma. Escorra em papel-toalha antes de montar o prato."
  },
  {
    id: "b4",
    meal: "cafe",
    category: "Café da manhã",
    title: "Panqueca de banana e aveia",
    subtitle: "Fofinha, sem açúcar e com frutas da estação por cima. Um clássico repaginado.",
    image: "assets/panqueca.jpg",
    kcal: 380, protein: 27, carbs: 44, fat: 10,
    time: 20, difficulty: "Fácil",
    tags: ["Sem açúcar", "Proteico"],
    ingredients: [
      { name: "Banana", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Ovos", qty: 2, unit: "unid.", aisle: "Proteínas" },
      { name: "Aveia em flocos", qty: 30, unit: "g", aisle: "Grãos e cereais" },
      { name: "Iogurte natural", qty: 40, unit: "g", aisle: "Laticínios" },
      { name: "Frutas vermelhas", qty: 50, unit: "g", aisle: "Hortifruti" },
      { name: "Canela em pó", qty: 0, unit: "a gosto", aisle: "Despensa" }
    ],
    steps: [
      "Bata a banana, os ovos, a aveia e a canela no liquidificador até homogeneizar.",
      "Aqueça uma frigideira antiaderente em fogo baixo e despeje pequenas porções da massa.",
      "Cozinhe por 2 minutos de cada lado, até dourar.",
      "Empilhe as panquecas, cubra com iogurte e frutas vermelhas."
    ],
    tip: "Quanto mais madura a banana, mais doce a panqueca fica — sem precisar de açúcar."
  },
  {
    id: "b5",
    meal: "cafe",
    category: "Café da manhã",
    title: "Smoothie bowl de frutas vermelhas",
    subtitle: "Banana congelada, morangos e iogurte em uma tigela colorida para comer de colher.",
    image: "assets/smoothie-bowl.jpg",
    kcal: 350, protein: 15, carbs: 54, fat: 9,
    time: 10, difficulty: "Fácil",
    tags: ["Sem cozinhar", "Fibras"],
    ingredients: [
      { name: "Banana", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Morangos", qty: 100, unit: "g", aisle: "Hortifruti" },
      { name: "Iogurte natural", qty: 120, unit: "g", aisle: "Laticínios" },
      { name: "Aveia em flocos", qty: 30, unit: "g", aisle: "Grãos e cereais" },
      { name: "Chia", qty: 4, unit: "g", aisle: "Despensa" },
      { name: "Cacau nibs", qty: 1, unit: "col. (chá)", aisle: "Despensa" }
    ],
    steps: [
      "Bata a banana congelada, os morangos, o iogurte e a aveia até ficar cremoso.",
      "Se precisar, acrescente uma colher de água para ajudar o liquidificador.",
      "Sirva em uma tigela e finalize com chia, cacau nibs e frutas frescas.",
      "Coma logo em seguida para manter a textura gelada."
    ],
    tip: "Deixe a banana fatiada no congelador durante a noite: ela deixa o bowl cremoso sem formar gelo."
  },
  {
    id: "b6",
    meal: "cafe",
    category: "Café da manhã",
    title: "Torrada dourada de banana",
    subtitle: "Pão integral dourado na frigideira, banana caramelizada e canela. Doce sem exagero.",
    image: "assets/torrada-banana.jpg",
    kcal: 370, protein: 15, carbs: 52, fat: 11,
    time: 15, difficulty: "Fácil",
    tags: ["Doce", "Rápido"],
    ingredients: [
      { name: "Pão integral", qty: 2, unit: "fatias", aisle: "Grãos e cereais" },
      { name: "Ovos", qty: 1, unit: "unid.", aisle: "Proteínas" },
      { name: "Leite desnatado", qty: 30, unit: "ml", aisle: "Laticínios" },
      { name: "Banana", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Mirtilos", qty: 40, unit: "g", aisle: "Hortifruti" },
      { name: "Canela em pó", qty: 0, unit: "a gosto", aisle: "Despensa" },
      { name: "Mel", qty: 1, unit: "col. (chá)", aisle: "Despensa" }
    ],
    steps: [
      "Bata o ovo com o leite e a canela em um prato fundo.",
      "Passe as fatias de pão na mistura, sem deixar encharcar.",
      "Doure na frigideira antiaderente por 2 minutos de cada lado.",
      "Sirva com a banana em rodelas, os mirtilos, canela e um fio de mel."
    ],
    tip: "Pão de um dia para o outro absorve melhor o ovo e não desmancha na frigideira."
  },
  {
    id: "l1",
    meal: "almoco",
    category: "Almoço",
    title: "Frango ao curry com arroz integral",
    subtitle: "Frango macio, arroz soltinho e brócolis no vapor em um prato cheio de cor.",
    image: "assets/frango.jpg",
    kcal: 620, protein: 45, carbs: 72, fat: 17,
    time: 30, difficulty: "Fácil",
    tags: ["Completo", "Alto em proteína"],
    ingredients: [
      { name: "Peito de frango", qty: 150, unit: "g", aisle: "Proteínas" },
      { name: "Arroz integral", qty: 80, unit: "g", aisle: "Grãos e cereais" },
      { name: "Brócolis", qty: 100, unit: "g", aisle: "Hortifruti" },
      { name: "Leite de coco", qty: 50, unit: "ml", aisle: "Despensa" },
      { name: "Curry em pó", qty: 1, unit: "col. (chá)", aisle: "Despensa" },
      { name: "Cebola", qty: 0.5, unit: "unid.", aisle: "Hortifruti" }
    ],
    steps: [
      "Cozinhe o arroz integral conforme as instruções da embalagem.",
      "Corte o frango em cubos, tempere com curry, sal e pimenta e sele em uma frigideira quente.",
      "Junte a cebola picada, o leite de coco e um pouco de água. Cozinhe por 8 minutos.",
      "Cozinhe o brócolis no vapor por 4 minutos e monte o prato com o arroz e o frango."
    ],
    tip: "Deixe o frango descansar dois minutos antes de cortar: ele fica visivelmente mais suculento."
  },
  {
    id: "l2",
    meal: "almoco",
    category: "Almoço",
    title: "Bowl de quinoa e legumes assados",
    subtitle: "Quinoa, abóbora caramelizada, grão-de-bico e um molho de tahine para amarrar tudo.",
    image: "assets/quinoa.jpg",
    kcal: 590, protein: 22, carbs: 74, fat: 20,
    time: 25, difficulty: "Fácil",
    tags: ["Vegetariano", "Rico em fibras"],
    ingredients: [
      { name: "Quinoa", qty: 70, unit: "g", aisle: "Grãos e cereais" },
      { name: "Grão-de-bico cozido", qty: 100, unit: "g", aisle: "Despensa" },
      { name: "Abóbora", qty: 150, unit: "g", aisle: "Hortifruti" },
      { name: "Abobrinha", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Tahine", qty: 1, unit: "col. (sopa)", aisle: "Despensa" },
      { name: "Limão", qty: 0.5, unit: "unid.", aisle: "Hortifruti" }
    ],
    steps: [
      "Lave a quinoa e cozinhe em água por cerca de 12 minutos, até os grãos abrirem.",
      "Corte a abóbora e a abobrinha, tempere com azeite e sal e asse a 200 °C por 20 minutos.",
      "Misture o tahine com limão, uma colher de água e sal para fazer o molho.",
      "Monte o bowl com quinoa, legumes, grão-de-bico e regue com o molho."
    ],
    tip: "Asse uma assadeira cheia de legumes no domingo: metade vira bowl, metade acompanha o jantar."
  },
  {
    id: "l3",
    meal: "almoco",
    category: "Almoço",
    title: "Frango grelhado com legumes e batata-doce",
    subtitle: "O almoço que resolve: proteína simples, batata dourada e legumes na chapa.",
    image: "assets/extra-chicken.jpg",
    kcal: 600, protein: 48, carbs: 52, fat: 18,
    time: 25, difficulty: "Fácil",
    tags: ["Completo", "Alto em proteína"],
    ingredients: [
      { name: "Peito de frango", qty: 180, unit: "g", aisle: "Proteínas" },
      { name: "Batata-doce", qty: 150, unit: "g", aisle: "Hortifruti" },
      { name: "Abobrinha", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Cenoura", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Azeite", qty: 15, unit: "ml", aisle: "Despensa" },
      { name: "Páprica defumada", qty: 1, unit: "col. (chá)", aisle: "Despensa" }
    ],
    steps: [
      "Corte a batata-doce em rodelas e cozinhe no vapor por 8 minutos.",
      "Tempere o frango com páprica, sal e pimenta. Grelhe por 5 minutos de cada lado.",
      "Na mesma frigideira, doure a abobrinha e a cenoura com um fio de azeite.",
      "Monte o prato e finalize com ervas frescas e raspas de limão."
    ],
    tip: "Bata levemente o peito de frango com um batedor antes de grelhar: ele cozinha por igual e fica mais macio."
  },
  {
    id: "l4",
    meal: "almoco",
    category: "Almoço",
    title: "Macarrão integral com pesto de abacate",
    subtitle: "Um pesto cremoso de abacate, manjericão e limão que abraça a massa integral.",
    image: "assets/macarrao.jpg",
    kcal: 580, protein: 20, carbs: 72, fat: 21,
    time: 20, difficulty: "Fácil",
    tags: ["Vegetariano", "Rápido"],
    ingredients: [
      { name: "Macarrão integral", qty: 90, unit: "g", aisle: "Grãos e cereais" },
      { name: "Abacate", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Manjericão fresco", qty: 1, unit: "punhado", aisle: "Hortifruti" },
      { name: "Tomate-cereja", qty: 8, unit: "unid.", aisle: "Hortifruti" },
      { name: "Castanha-do-pará", qty: 2, unit: "unid.", aisle: "Despensa" },
      { name: "Limão", qty: 0.5, unit: "unid.", aisle: "Hortifruti" }
    ],
    steps: [
      "Cozinhe o macarrão al dente e reserve uma xícara da água do cozimento.",
      "Bata o abacate, o manjericão, as castanhas, o limão e um pouco da água no processador.",
      "Misture o pesto ao macarrão ainda quente, ajustando a textura com a água reservada.",
      "Finalize com tomate-cereja cortado ao meio, pimenta-do-reino e folhas de manjericão."
    ],
    tip: "O limão não é só sabor: ele mantém o abacate verdinho por mais tempo."
  },
  {
    id: "l5",
    meal: "almoco",
    category: "Almoço",
    title: "Curry de grão-de-bico com espinafre",
    subtitle: "Grão-de-bico, tomate e leite de coco em um curry cremoso com arroz integral.",
    image: "assets/curry-grao-de-bico.jpg",
    kcal: 560, protein: 19, carbs: 68, fat: 20,
    time: 30, difficulty: "Fácil",
    tags: ["Vegetariano", "Completo"],
    ingredients: [
      { name: "Grão-de-bico cozido", qty: 150, unit: "g", aisle: "Despensa" },
      { name: "Arroz integral", qty: 60, unit: "g", aisle: "Grãos e cereais" },
      { name: "Espinafre", qty: 2, unit: "punhados", aisle: "Hortifruti" },
      { name: "Tomate", qty: 2, unit: "unid.", aisle: "Hortifruti" },
      { name: "Leite de coco", qty: 100, unit: "ml", aisle: "Despensa" },
      { name: "Curry em pó", qty: 1, unit: "col. (chá)", aisle: "Despensa" },
      { name: "Cebola", qty: 0.5, unit: "unid.", aisle: "Hortifruti" }
    ],
    steps: [
      "Cozinhe o arroz integral conforme as instruções da embalagem.",
      "Refogue a cebola com o curry em um fio de azeite até perfumar.",
      "Acrescente o tomate picado, o grão-de-bico e o leite de coco. Cozinhe por 10 minutos.",
      "Junte o espinafre, ajuste o sal e sirva sobre o arroz."
    ],
    tip: "O curry fica ainda melhor no dia seguinte — porção perfeita para meal prep."
  },
  {
    id: "l6",
    meal: "almoco",
    category: "Almoço",
    title: "Salada de atum com batata-doce",
    subtitle: "Atum, batata-doce assada e folhas com molho de limão. Um almoço fresco que sustenta.",
    image: "assets/salada-atum.jpg",
    kcal: 480, protein: 32, carbs: 42, fat: 18,
    time: 25, difficulty: "Fácil",
    tags: ["Proteico", "Leve"],
    ingredients: [
      { name: "Atum em água", qty: 120, unit: "g", aisle: "Proteínas" },
      { name: "Batata-doce", qty: 150, unit: "g", aisle: "Hortifruti" },
      { name: "Grão-de-bico cozido", qty: 80, unit: "g", aisle: "Despensa" },
      { name: "Mix de folhas", qty: 2, unit: "punhados", aisle: "Hortifruti" },
      { name: "Tomate-cereja", qty: 8, unit: "unid.", aisle: "Hortifruti" },
      { name: "Azeite", qty: 10, unit: "ml", aisle: "Despensa" },
      { name: "Limão", qty: 0.5, unit: "unid.", aisle: "Hortifruti" }
    ],
    steps: [
      "Corte a batata-doce em cubos, tempere com azeite e asse a 200 °C por 20 minutos.",
      "Escorra o atum e separe o grão-de-bico.",
      "Monte uma cama de folhas com tomate-cereja, grão-de-bico e batata-doce.",
      "Distribua o atum por cima e finalize com azeite, limão, sal e pimenta."
    ],
    tip: "Asse uma assadeira de batata-doce de uma vez e use em saladas durante a semana."
  },
  {
    id: "d1",
    meal: "jantar",
    category: "Jantar",
    title: "Salmão grelhado com legumes",
    subtitle: "Salmão dourado, legumes al dente e limão. Um jantar leve que não economiza sabor.",
    image: "assets/extra-salmon.jpg",
    kcal: 560, protein: 42, carbs: 44, fat: 23,
    time: 25, difficulty: "Fácil",
    tags: ["Ômega 3", "Low carb"],
    ingredients: [
      { name: "Salmão", qty: 160, unit: "g", aisle: "Proteínas" },
      { name: "Abóbora", qty: 200, unit: "g", aisle: "Hortifruti" },
      { name: "Abobrinha", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Limão siciliano", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Azeite", qty: 15, unit: "ml", aisle: "Despensa" },
      { name: "Alho", qty: 1, unit: "dente", aisle: "Hortifruti" }
    ],
    steps: [
      "Cozinhe a abóbora em cubos no vapor por 10 minutos e amasse com azeite e sal.",
      "Tempere o salmão com sal, pimenta e raspas de limão.",
      "Grelhe o salmão com a pele para baixo por 4 minutos e vire por mais 2.",
      "Salteie a abobrinha com alho e sirva com o purê de abóbora e fatias de limão."
    ],
    tip: "Se preferir, faça o salmão no forno a 200 °C por 12 minutos — quase nenhuma louça e o mesmo resultado."
  },
  {
    id: "d2",
    meal: "jantar",
    category: "Jantar",
    title: "Sopa cremosa de lentilha",
    subtitle: "Lentilha, tomate e ervas em uma sopa aveludada e reconfortante para fechar o dia.",
    image: "assets/sopa.jpg",
    kcal: 520, protein: 24, carbs: 62, fat: 16,
    time: 30, difficulty: "Fácil",
    tags: ["Vegetariano", "Reconfortante"],
    ingredients: [
      { name: "Lentilha", qty: 80, unit: "g", aisle: "Despensa" },
      { name: "Tomate", qty: 2, unit: "unid.", aisle: "Hortifruti" },
      { name: "Cenoura", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Cebola", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Caldo de legumes", qty: 500, unit: "ml", aisle: "Despensa" },
      { name: "Azeite", qty: 15, unit: "ml", aisle: "Despensa" }
    ],
    steps: [
      "Refogue a cebola e a cenoura no azeite até amaciarem.",
      "Acrescente o tomate picado, a lentilha e o caldo de legumes.",
      "Cozinhe por 20 minutos, até a lentilha ficar bem macia.",
      "Bata metade da sopa no liquidificador e volte à panela para ficar cremosa. Ajuste o sal."
    ],
    tip: "Uma colher de iogurte natural na hora de servir deixa a sopa ainda mais sedosa."
  },
  {
    id: "d3",
    meal: "jantar",
    category: "Jantar",
    title: "Omelete de forno com espinafre",
    subtitle: "Ovos, espinafre e queijo assados até dourar. Jantar pronto com pouca louça.",
    image: "assets/omelete.jpg",
    kcal: 500, protein: 33, carbs: 30, fat: 28,
    time: 20, difficulty: "Fácil",
    tags: ["Rápido", "Proteico"],
    ingredients: [
      { name: "Ovos", qty: 3, unit: "unid.", aisle: "Proteínas" },
      { name: "Espinafre", qty: 2, unit: "punhados", aisle: "Hortifruti" },
      { name: "Queijo minas frescal", qty: 40, unit: "g", aisle: "Laticínios" },
      { name: "Pão integral", qty: 1, unit: "fatia", aisle: "Grãos e cereais" },
      { name: "Tomate", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Leite desnatado", qty: 30, unit: "ml", aisle: "Laticínios" }
    ],
    steps: [
      "Bata os ovos com o leite, sal e pimenta.",
      "Refogue o espinafre rapidamente e distribua em uma assadeira pequena.",
      "Despeje os ovos, acrescente o queijo e o tomate em rodelas.",
      "Asse a 200 °C por 15 minutos e sirva com o pão tostado."
    ],
    tip: "Faça em forminhas individuais e congele: é só aquecer por 3 minutos na air fryer."
  },
  {
    id: "d4",
    meal: "jantar",
    category: "Jantar",
    title: "Wrap de frango com iogurte e ervas",
    subtitle: "Frango desfiado, molho cremoso de iogurte e folhas em um jantar que se monta em minutos.",
    image: "assets/wrap.jpg",
    kcal: 540, protein: 38, carbs: 46, fat: 19,
    time: 15, difficulty: "Fácil",
    tags: ["Rápido", "Prático"],
    ingredients: [
      { name: "Tortilha integral", qty: 1, unit: "unid.", aisle: "Grãos e cereais" },
      { name: "Frango desfiado", qty: 120, unit: "g", aisle: "Proteínas" },
      { name: "Iogurte natural", qty: 40, unit: "g", aisle: "Laticínios" },
      { name: "Mix de folhas", qty: 1, unit: "punhado", aisle: "Hortifruti" },
      { name: "Tomate", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Cenoura", qty: 0.5, unit: "unid.", aisle: "Hortifruti" }
    ],
    steps: [
      "Tempere o frango desfiado com sal, pimenta e páprica.",
      "Misture o iogurte com hortelã, limão e uma pitada de sal.",
      "Aqueça a tortilha na frigideira por 30 segundos de cada lado.",
      "Recheie com o frango, as folhas, tomate, cenoura e o molho. Enrole bem apertado."
    ],
    tip: "Aqueça a tortilha antes de enrolar: ela fica flexível e não rasga."
  },
  {
    id: "d5",
    meal: "jantar",
    category: "Jantar",
    title: "Risoto de cogumelos e espinafre",
    subtitle: "Arroz cremoso, cogumelos dourados e espinafre para um jantar reconfortante.",
    image: "assets/risoto-cogumelos.jpg",
    kcal: 520, protein: 18, carbs: 64, fat: 20,
    time: 35, difficulty: "Intermediário",
    tags: ["Vegetariano", "Reconfortante"],
    ingredients: [
      { name: "Arroz arbóreo", qty: 80, unit: "g", aisle: "Grãos e cereais" },
      { name: "Cogumelos", qty: 150, unit: "g", aisle: "Hortifruti" },
      { name: "Espinafre", qty: 2, unit: "punhados", aisle: "Hortifruti" },
      { name: "Caldo de legumes", qty: 500, unit: "ml", aisle: "Despensa" },
      { name: "Queijo parmesão", qty: 20, unit: "g", aisle: "Laticínios" },
      { name: "Cebola", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Azeite", qty: 10, unit: "ml", aisle: "Despensa" }
    ],
    steps: [
      "Doure os cogumelos em uma panela com metade do azeite e reserve.",
      "Refogue a cebola, acrescente o arroz e mexa por 2 minutos.",
      "Adicione o caldo quente aos poucos, mexendo até o arroz ficar cremoso.",
      "Junte os cogumelos e o espinafre no final e finalize com parmesão."
    ],
    tip: "Mantenha o caldo quente ao lado da panela: choque térmico deixa o risoto empapado."
  },
  {
    id: "d6",
    meal: "jantar",
    category: "Jantar",
    title: "Sopa de abóbora com gengibre",
    subtitle: "Abóbora assada, gengibre e leite de coco em uma sopa aveludada e cheia de cor.",
    image: "assets/sopa-abobora.jpg",
    kcal: 390, protein: 12, carbs: 50, fat: 14,
    time: 25, difficulty: "Fácil",
    tags: ["Vegetariano", "Reconfortante"],
    ingredients: [
      { name: "Abóbora", qty: 300, unit: "g", aisle: "Hortifruti" },
      { name: "Cenoura", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Gengibre", qty: 1, unit: "col. (chá)", aisle: "Hortifruti" },
      { name: "Caldo de legumes", qty: 500, unit: "ml", aisle: "Despensa" },
      { name: "Leite de coco", qty: 80, unit: "ml", aisle: "Despensa" },
      { name: "Sementes de abóbora", qty: 1, unit: "col. (sopa)", aisle: "Despensa" },
      { name: "Azeite", qty: 5, unit: "ml", aisle: "Despensa" }
    ],
    steps: [
      "Cozinhe a abóbora e a cenoura no caldo por 15 minutos, até amaciarem.",
      "Bata com o gengibre no liquidificador até ficar liso.",
      "Volte à panela, acrescente o leite de coco e aqueça sem ferver.",
      "Sirva com sementes de abóbora e um fio de azeite."
    ],
    tip: "Assar a abóbora antes intensifica o sabor, mas cozinhar no caldo economiza tempo."
  },
  {
    id: "s1",
    meal: "lanche",
    category: "Lanche",
    title: "Iogurte grego com granola",
    subtitle: "Cremoso, crocante e doce na medida. O lanche que salva a tarde.",
    image: "assets/iogurte.jpg",
    kcal: 260, protein: 18, carbs: 32, fat: 6,
    time: 5, difficulty: "Fácil",
    tags: ["Sem cozinhar", "Proteico"],
    ingredients: [
      { name: "Iogurte grego natural", qty: 170, unit: "g", aisle: "Laticínios" },
      { name: "Granola", qty: 30, unit: "g", aisle: "Grãos e cereais" },
      { name: "Morangos", qty: 60, unit: "g", aisle: "Hortifruti" },
      { name: "Mel", qty: 1, unit: "col. (chá)", aisle: "Despensa" },
      { name: "Chia", qty: 4, unit: "g", aisle: "Despensa" }
    ],
    steps: [
      "Coloque o iogurte em um bowl ou pote.",
      "Acrescente a granola e as frutas cortadas.",
      "Finalize com mel e chia.",
      "Se for levar, deixe a granola separada até a hora de comer."
    ],
    tip: "Prefira granola com menos açúcar adicionado e frutas da estação para variar o sabor."
  },
  {
    id: "s2",
    meal: "lanche",
    category: "Lanche",
    title: "Maçã com pasta de amendoim",
    subtitle: "Crocante, salgadinho e doce ao mesmo tempo. Uma pausa de cinco minutos.",
    image: "assets/maca.jpg",
    kcal: 230, protein: 6, carbs: 26, fat: 12,
    time: 5, difficulty: "Fácil",
    tags: ["Sem cozinhar", "Prático"],
    ingredients: [
      { name: "Maçã", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Pasta de amendoim", qty: 1, unit: "col. (sopa)", aisle: "Despensa" },
      { name: "Canela em pó", qty: 0, unit: "a gosto", aisle: "Despensa" },
      { name: "Castanhas", qty: 1, unit: "col. (sopa)", aisle: "Despensa" }
    ],
    steps: [
      "Corte a maçã em fatias grossas.",
      "Espalhe a pasta de amendoim sobre as fatias.",
      "Polvilhe canela e castanhas picadas.",
      "Sirva na hora para manter a crocância."
    ],
    tip: "Escolha pasta de amendoim com um ou dois ingredientes no rótulo: amendoim e, no máximo, sal."
  },
  {
    id: "s3",
    meal: "lanche",
    category: "Lanche",
    title: "Creme de ricota com legumes",
    subtitle: "Um dip leve com ervas frescas para mergulhar cenoura, pepino e o que tiver na geladeira.",
    image: "assets/extra-yogurt.jpg",
    kcal: 210, protein: 9, carbs: 18, fat: 11,
    time: 10, difficulty: "Fácil",
    tags: ["Vegetariano", "Low carb"],
    ingredients: [
      { name: "Ricota", qty: 100, unit: "g", aisle: "Laticínios" },
      { name: "Iogurte natural", qty: 40, unit: "g", aisle: "Laticínios" },
      { name: "Hortelã", qty: 0, unit: "a gosto", aisle: "Hortifruti" },
      { name: "Cenoura", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Pepino", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Azeite", qty: 5, unit: "ml", aisle: "Despensa" }
    ],
    steps: [
      "Amasse a ricota com o iogurte até ficar cremoso.",
      "Tempere com hortelã picada, azeite, sal e pimenta.",
      "Corte a cenoura e o pepino em palitos.",
      "Sirva o creme no centro de um prato com os legumes ao redor."
    ],
    tip: "O creme dura até 3 dias na geladeira. Ótimo para deixar pronto no domingo."
  },
  {
    id: "s4",
    meal: "lanche",
    category: "Lanche",
    title: "Mousse de cacau com banana",
    subtitle: "Chocolate de verdade, textura de mousse e nenhum açúcar refinado.",
    image: "assets/mousse.jpg",
    kcal: 240, protein: 13, carbs: 28, fat: 8,
    time: 10, difficulty: "Fácil",
    tags: ["Sem açúcar", "Doce"],
    ingredients: [
      { name: "Banana", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Cacau em pó 100%", qty: 1, unit: "col. (sopa)", aisle: "Despensa" },
      { name: "Iogurte grego natural", qty: 130, unit: "g", aisle: "Laticínios" },
      { name: "Mel", qty: 1, unit: "col. (chá)", aisle: "Despensa" },
      { name: "Cacau nibs", qty: 1, unit: "col. (chá)", aisle: "Despensa" }
    ],
    steps: [
      "Bata a banana, o cacau, o iogurte e o mel no liquidificador.",
      "Distribua em dois potinhos e leve à geladeira por 30 minutos.",
      "Finalize com cacau nibs antes de servir.",
      "Se quiser mais firmeza, acrescente meia banana congelada."
    ],
    tip: "Cacau em pó 100% tem sabor intenso e nenhum açúcar — leia o rótulo antes de comprar."
  },
  {
    id: "s5",
    meal: "lanche",
    category: "Lanche",
    title: "Smoothie de banana com cacau",
    subtitle: "Cremoso, gelado e com gosto de sobremesa — sem açúcar adicionado.",
    image: "assets/smoothie-banana.jpg",
    kcal: 230, protein: 9, carbs: 38, fat: 6,
    time: 5, difficulty: "Fácil",
    tags: ["Sem açúcar", "Rápido"],
    ingredients: [
      { name: "Banana", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Leite desnatado", qty: 200, unit: "ml", aisle: "Laticínios" },
      { name: "Cacau em pó 100%", qty: 1, unit: "col. (sopa)", aisle: "Despensa" },
      { name: "Aveia em flocos", qty: 20, unit: "g", aisle: "Grãos e cereais" },
      { name: "Canela em pó", qty: 0, unit: "a gosto", aisle: "Despensa" }
    ],
    steps: [
      "Bata todos os ingredientes no liquidificador até ficar homogêneo.",
      "Se quiser mais gelado, use a banana congelada em rodelas.",
      "Ajuste a textura com mais leite e sirva imediatamente.",
      "Polvilhe canela por cima."
    ],
    tip: "Congele bananas maduras em rodelas: você evita desperdício e ganha um smoothie mais cremoso."
  },
  {
    id: "s6",
    meal: "lanche",
    category: "Lanche",
    title: "Homus com palitos de legumes",
    subtitle: "Creme de grão-de-bico com tahine e limão para mergulhar cenoura e pepino.",
    image: "assets/homus.jpg",
    kcal: 190, protein: 7, carbs: 20, fat: 9,
    time: 10, difficulty: "Fácil",
    tags: ["Vegetariano", "Fibras"],
    ingredients: [
      { name: "Grão-de-bico cozido", qty: 100, unit: "g", aisle: "Despensa" },
      { name: "Tahine", qty: 1, unit: "col. (sopa)", aisle: "Despensa" },
      { name: "Limão", qty: 0.5, unit: "unid.", aisle: "Hortifruti" },
      { name: "Alho", qty: 1, unit: "dente", aisle: "Hortifruti" },
      { name: "Azeite", qty: 5, unit: "ml", aisle: "Despensa" },
      { name: "Cenoura", qty: 1, unit: "unid.", aisle: "Hortifruti" },
      { name: "Pepino", qty: 0.5, unit: "unid.", aisle: "Hortifruti" }
    ],
    steps: [
      "Bata o grão-de-bico, o tahine, o limão, o alho e o azeite no processador.",
      "Acrescente água gelada aos poucos até o creme ficar liso.",
      "Tempere com sal e pimenta e ajuste o limão.",
      "Corte cenoura e pepino em palitos e sirva com o homus."
    ],
    tip: "Se quiser um homus ainda mais sedoso, retire a pele dos grãos-de-bico antes de bater."
  }
];

const WEEK_TEMPLATES = {
  0: { cafe: "b1", almoco: "l1", lanche: "s1", jantar: "d1" },
  1: { cafe: "b2", almoco: "l2", lanche: "s2", jantar: "d2" },
  2: { cafe: "b1", almoco: "l3", lanche: "s1", jantar: "d1" },
  3: { cafe: "b3", almoco: "l2", lanche: "s1", jantar: "d4" },
  4: { cafe: "b1", almoco: "l3", lanche: "s3", jantar: "d3" },
  5: { cafe: "b4", almoco: "l4", lanche: "s2", jantar: "d1" },
  6: { cafe: "b2", almoco: "l1", lanche: "s4", jantar: "d2" }
};

const DEFAULT_PROFILE = {
  name: "Marina Costa",
  firstName: "Marina",
  goalLabel: "Emagrecimento saudável",
  calories: 1850,
  protein: 130,
  carbs: 205,
  fat: 60,
  waterGoal: 8
};

const NUTRI_TIPS = [
  {
    title: "Proteína no café da manhã",
    text: "Começar o dia com ovos, iogurte ou queijo ajuda a segurar a fome até o almoço.",
    action: "Ver cafés da manhã",
    filter: "cafe"
  },
  {
    title: "Monte o prato em camadas",
    text: "Metade de vegetais, um quarto de proteína e um quarto de carboidrato. Simples assim.",
    action: "Ver almoços",
    filter: "almoco"
  },
  {
    title: "Planejar também é cuidar",
    text: "Deixar duas refeições prontas na geladeira reduz a chance de decisões por impulso.",
    action: "Ver jantares",
    filter: "jantar"
  }
];
